"""Local-only paired harness; real pinned Django APIs/HMAC/PostgreSQL, synthetic users.
Never import this from the application. Never use a shared/deployed database.
"""
import hashlib
import hmac
import io
import json
import logging
import os
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from time import monotonic
from urllib.parse import urlencode, urlsplit
from uuid import uuid4

B3 = bool(os.environ.get("B3_BACKEND_ROOT"))
ROOT = Path(os.environ.get("B3_BACKEND_ROOT") or os.environ["B2_BACKEND_ROOT"]).resolve()
if not os.environ.get("POSTGRES_DB", "").startswith("frocal_b3_" if B3 else "frocal_b2_") or os.environ.get("POSTGRES_HOST") not in {"127.0.0.1", "localhost"}:
    raise RuntimeError("Paired harness requires an isolated local frocal_b2_ database")
sys.path.insert(0, str(ROOT))
os.environ["DJANGO_SETTINGS_MODULE"] = "dexo_land.settings.test"
import django
django.setup()
from django.conf import settings
from django.core.management import call_command
from django.db import connections, transaction, connection
from django.test import Client
from django.utils import timezone
from apps.game_config.models import GameConfigVersion
from apps.game_config.services import publish_game_config, resolve_effective_game_config
from apps.players.models import Player, PlayerAvatar
from apps.progression.models import PlayerProgression
from apps.seasons.models import Season, PlayerSeason
from apps.seasons.services import activate_season
from apps.rewards.services import settle_player_reward
from apps.rewards.models import RewardLedger
from apps.base_tap.models import TapBurstState, BaseTapDailyAccumulator
from PIL import Image

settings.ALLOWED_HOSTS = ["testserver", "127.0.0.1", "localhost"]
settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
settings.TELEGRAM_BOT_TOKEN = "123456:isolated-b2-test-only"
settings.TAP_V2_ISSUANCE_ENABLED = True
settings.BASE_TAP_LEGACY_INGRESS_ENABLED = False
settings.TAP_V2_PLAYER_REQUESTS = 10000
settings.TAP_V2_SESSION_REQUESTS = 10000
settings.AVATAR_CACHE_ENABLED = True
settings.AVATAR_S3_BUCKET = "isolated-test-cache"
settings.AVATAR_PUBLIC_API_ORIGIN = "https://cached-avatar.test"
logging.disable(logging.CRITICAL)
from apps.base_tap.schemas import BatchOutput, BatchInput, TapStateOutput
if B3:
    fixtures = json.loads(Path("src/integrations/api/fixtures/b3/session-switch.json").read_text())
    for key in ("initial", "another_device", "switch_response", "moved"):
        TapStateOutput.model_validate(fixtures[key])
else:
    fixtures = json.loads(Path("src/integrations/api/fixtures/tap-v2.json").read_text())
    for key, value in fixtures.items():
        if key.endswith("response"): BatchOutput.model_validate(value)
        elif key in {"initial_state", "state_after_daily_reward"}: TapStateOutput.model_validate(value)
        elif key in {"batch_request", "partial_request"}: BatchInput.model_validate(value)
call_command("migrate", interactive=False, verbosity=0)

epoch = monotonic()
offset = 0.0
BASE = datetime(2026, 1, 2, tzinfo=UTC)
def now():
    return BASE + timedelta(seconds=monotonic() - epoch + offset)
timezone.now = now
from apps.telegram.auth import verify_init_data as real_verify
import apps.telegram.mini_app_auth as mini_auth
mini_auth.verify_init_data = lambda raw, **kwargs: real_verify(raw, now=now(), **kwargs)

sample = json.loads((ROOT / "config/examples/season1.game-config.v2.json").read_text())
config = GameConfigVersion.objects.filter(version="b2-paired").first()
if not config:
    config = GameConfigVersion.objects.create(version="b2-paired", schema_version=sample["meta"]["schema_version"], effective_at=BASE - timedelta(days=1), payload=sample)
    config = publish_game_config(config, published_at=BASE - timedelta(days=2))
season = Season.objects.filter(status=Season.Status.ACTIVE).first()
if not season:
    season = Season.objects.create(code=f"paired-{uuid4().hex[:8]}", title="Season One", starts_at=BASE - timedelta(days=1), ends_at=BASE + timedelta(days=44), baseline_config=config)
    season = activate_season(season)

image = io.BytesIO()
Image.new("RGB", (32, 32), (40, 80, 100)).save(image, "JPEG")
class IsolatedStorage:
    unavailable = False
    def get(self, key):
        if self.unavailable:
            raise OSError("isolated storage unavailable")
        return image.getvalue()
storage = IsolatedStorage()
import apps.players.avatars as avatars
avatars.get_storage = lambda: storage

def credentials(player):
    values = {"auth_date": str(int(now().timestamp())), "query_id": "isolated-b2", "user": json.dumps({"id": player.telegram_user_id, "first_name": player.first_name, "photo_url": player.photo_url}, separators=(",", ":"))}
    check = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret = hmac.new(b"WebAppData", settings.TELEGRAM_BOT_TOKEN.encode(), hashlib.sha256).digest()
    values["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(values)

def publish(payload):
    global offset, config
    version = f"paired-config-{uuid4().hex[:8]}"
    effective = now() + timedelta(seconds=1)
    if payload["base_tap"].get("protocol_version", 1) == 2 and config.payload["base_tap"].get("protocol_version", 1) == 1:
        effective = (now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    updated = GameConfigVersion.objects.create(version=version, schema_version=payload["meta"]["schema_version"], effective_at=effective, payload=payload)
    config = publish_game_config(updated, published_at=now())
    offset += max(1.1, (effective - now()).total_seconds() + 0.1)
    return version

def control(data):
    global offset, config, season
    action = data.get("action", "player")
    if action == "advance":
        offset += float(data["seconds"])
        return {"server_time": now().isoformat()}
    if action == "flags":
        settings.TAP_V2_ISSUANCE_ENABLED = data.get("issuance", True)
        settings.BASE_TAP_LEGACY_INGRESS_ENABLED = data.get("legacy", False)
        storage.unavailable = data.get("storage_unavailable", False)
        return {"ok": True}
    if action == "config":
        import copy
        payload = copy.deepcopy(sample)
        payload["base_tap"]["points_per_rewarded_tap"] = data.get("reward", 2)
        payload["base_tap"]["cooldown_seconds"] = data.get("cooldown", 10)
        version = publish(payload)
        return {"version": version}
    if action == "season":
        # Isolated administrative fixture transition, never a public API action.
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SELECT set_config('dexo.season_transition', 'on', true)")
            Season.objects.filter(pk=season.pk).update(status=Season.Status.CLOSED)
        started = now()
        season = Season.objects.create(code=f"paired-{uuid4().hex[:8]}", title="Season Two", starts_at=started, ends_at=started + timedelta(days=45), baseline_config=config)
        season = activate_season(season)
        return {"season": season.code}
    if action == "player":
        identifier = int(uuid4().hex[:12], 16)
        player = Player.objects.create(telegram_user_id=identifier, first_name="Verified", first_seen_at=now(), last_seen_at=now(), first_seen_source="MINI_APP", photo_url="https://telegram-photo-blocked.test/photo.jpg")
        amount = int(data.get("points", 150))
        if amount:
            settle_player_reward(player=player, source_type="TEST", source_id=str(player.pk), context="TEST", amount=amount, idempotency_key=f"paired-initial:{player.pk}", occurred_at=now(), resolved_config=resolve_effective_game_config(now()), create_settlement_outbox=False)
        if data.get("cached_avatar", False):
            PlayerAvatar.objects.create(player=player, source_fingerprint=avatars.fingerprint(player), object_key="avatars/isolated.jpg", expires_at=now() + timedelta(days=1), refresh_after=now() + timedelta(days=1))
        return {"player": str(identifier), "initData": credentials(player)}
    player = Player.objects.get(telegram_user_id=int(data["player"]))
    if action == "legacy":
        from apps.base_tap.services import submit_tap_batch, finalize_tap_accumulator
        legacy = json.loads((ROOT / "config/examples/season1.game-config.v1.json").read_text())
        publish(legacy)
        settings.TAP_V2_ISSUANCE_ENABLED = False
        settings.BASE_TAP_LEGACY_INGRESS_ENABLED = True
        key = f"paired-legacy:{uuid4()}"
        result = submit_tap_batch(player, tap_count=7, idempotency_key=key, at=now())
        settings.BASE_TAP_LEGACY_INGRESS_ENABLED = False
        accumulator = BaseTapDailyAccumulator.objects.get(player=player)
        finalize_tap_accumulator(accumulator.pk, at=now(), force=True)
        publish(sample)
        settings.TAP_V2_ISSUANCE_ENABLED = True
        return {"idempotencyKey": key, "tapCount": 7, "accepted": result.accepted_taps, "initData": credentials(player)}
    if action == "credentials":
        return {"initData": credentials(player)}
    if action == "reward":
        amount = int(data.get("amount", 7))
        settle_player_reward(player=player, source_type=data.get("source", "DAILY"), source_id=uuid4().hex, context="TEST", amount=amount, idempotency_key=f"paired-other:{uuid4()}", occurred_at=now(), resolved_config=resolve_effective_game_config(now()), create_settlement_outbox=False)
        return {"lifetime": PlayerProgression.objects.get(player=player).lifetime_points}
    if action == "inspect":
        burst = TapBurstState.objects.filter(player=player).first()
        return {"lifetime": PlayerProgression.objects.get(player=player).lifetime_points,
            "ledger_rows": RewardLedger.objects.filter(player=player).count(),
            "remaining": burst.remaining if burst else None,
            "season_points": list(PlayerSeason.objects.filter(player=player).values_list("season_points", flat=True))}
    raise ValueError("Unknown isolated control")

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass
    def do_GET(self):
        self.handle_request()
    def do_POST(self):
        self.handle_request()
    def handle_request(self):
        try:
            body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
            if self.path == "/__b2_test__":
                result = control(json.loads(body or b"{}"))
                self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
                self.wfile.write(json.dumps(result).encode()); return
            if self.path == "/__ready__":
                self.send_response(200); self.end_headers(); self.wfile.write(b"ready"); return
            if not urlsplit(self.path).path.startswith("/api/v1/"):
                self.send_response(404); self.end_headers(); return
            client = Client()
            headers = {"Authorization": self.headers.get("Authorization", "")}
            if self.headers.get("Idempotency-Key"):
                headers["Idempotency-Key"] = self.headers["Idempotency-Key"]
            response = client.generic(self.command, self.path, data=body, content_type="application/json", headers=headers)
            self.send_response(response.status_code)
            for key, value in response.items():
                if key.lower() != "content-length": self.send_header(key, value)
            self.end_headers(); self.wfile.write(response.content)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Expected when the browser cancels a request during refresh/account switch.
        except Exception as error:
            if self.path == "/__b2_test__":
                import traceback
                traceback.print_exc()
            self.send_response(500); self.send_header("Content-Type", "application/json"); self.end_headers()
            self.wfile.write(json.dumps({"isolated_error": type(error).__name__}).encode())
        finally:
            connections.close_all()

print("Pinned isolated Django/PostgreSQL harness ready", flush=True)
ThreadingHTTPServer(("127.0.0.1", int(os.getenv("B2_TEST_API_PORT", "8792"))), Handler).serve_forever()
