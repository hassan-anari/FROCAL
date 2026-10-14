"""Validate fixtures using exact reviewed Ninja schemas; no DB, HTTP or auth provisioning."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
from typing import get_args

from django.conf import settings

ROOT = Path(__file__).resolve().parents[2]
PIN = "cadc257fbed5c6bf36e31c767e70f4cd430e350d"
SOURCES = {
    "backend-bootstrap-schemas.py": "78075564dcecad58f1815fee067d0f7aa474ce88",
    "backend-api-errors.py": "a1aa7d1fa5ba1988ad0d5c9c291a8bb6ed8a455f",
}
for filename, expected in SOURCES.items():
    raw = (Path(__file__).parent / filename).read_bytes()
    actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    if actual != expected:
        raise SystemExit(f"Reviewed backend source pin mismatch: {filename}")

# Load only DTO declarations, without the backend project or its services/models.
settings.configure(SECRET_KEY="synthetic-schema-fixture-only", INSTALLED_APPS=[])
bootstrap = runpy.run_path(str(Path(__file__).parent / "backend-bootstrap-schemas.py"))
errors = runpy.run_path(str(Path(__file__).parent / "backend-api-errors.py"))
Output = bootstrap["BootstrapOutput"]
fixture = Output.model_validate({
    "contract_version": "1.1", "request_id": "synthetic-b1-contract", "server_time": "2026-10-14T12:00:00Z",
    "player": {"id": "42", "telegram_user_id": 42, "first_name": "Verified", "last_name": "Player", "username": "verified",
               "language_code": "en", "photo_url": "https://example.test/verified-player.png"},
    "progression": {"lifetime_points": 321, "level": 7, "current_threshold": 300, "next_threshold": 500,
                    "points_into_level": 21, "points_remaining": 179, "dexo_stage": "specialist"},
    "season": {"code": "season-1", "title": "Season One", "status": "ACTIVE", "starts_at": "2026-10-01T00:00:00Z",
               "ends_at": "2026-11-15T00:00:00Z", "season_points": 21},
    "config": {"version": "synthetic-b1-v1", "effective_at": "2026-10-01T00:00:00Z", "schema_version": 1,
               "payload_checksum": "a" * 64, "progression": {
                   "levels": [{"level": 1, "min_lifetime_points": 0}, {"level": 7, "min_lifetime_points": 300}, {"level": 8, "min_lifetime_points": 500}],
                   "dexo_stages": [{"key": "newborn", "min_level": 1}, {"key": "specialist", "min_level": 7}], "clan_min_level": 5}},
    "features": {"season": True, "daily": False, "typing": False, "missions": False, "referral": False,
                 "network": False, "base_tap": True, "clan": False, "profile": True, "arena": True},
    "gameplay": {"moderation_state": "ACTIVE", "reward_earning_allowed": True},
    "daily": None, "typing": None, "missions": None, "referral": None, "network": None,
}).model_dump(mode="json")
error_fixture = [errors["IntegrationErrorOutput"].model_validate({
    "detail": "synthetic server detail never displayed", "code": code, "request_id": "synthetic-b1-error"
}).model_dump(mode="json") for code in get_args(errors["ErrorCode"])]
outputs = {
    "src/integrations/api/fixtures/bootstrap-b1.json": fixture,
    "src/integrations/api/fixtures/bootstrap-b1-errors.json": error_fixture,
    "scripts/contracts/backend-bootstrap-schema.json": Output.model_json_schema(),
    "scripts/contracts/source-pin.json": {"repository": "hassan-anari/WEDCAL", "pr": 26, "commit": PIN, "git_blobs": SOURCES,
        "fixture_note": "Synthetic schema-valid values only; not an economy config, signed authentication fixture or production player."},
}
parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
for relative, data in outputs.items():
    path = ROOT / relative
    serialized = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if not path.exists() or path.read_text() != serialized:
            raise SystemExit(f"Generated contract fixture drift: {relative}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(serialized)
print(f"Reviewed BootstrapOutput/BootstrapFeatures/ErrorOutput fixtures verified at {PIN}; no database or API calls")
