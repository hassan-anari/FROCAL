"""Isolated source/Admin/Telegram/storage controls for exact-backend B6 pairing.
No production route, fixture response or fabricated membership/economic projection.
"""
from datetime import timedelta
from uuid import uuid4


def install(world):
    from django.test.utils import setup_test_environment
    setup_test_environment()
    world["settings"].AVATAR_PUBLIC_API_ORIGIN = "https://cached-avatar.test"


def control(data, world):
    from apps.players.models import Player
    from apps.clans.models import ClanMembership
    from apps.game_config.services import resolve_game_config_version
    player = Player.objects.get(telegram_user_id=int(data["player"]))
    now = world["now"]()
    action = data["action"]
    if action == "b6-rankings":
        from apps.arena.services import consume_pending_events, rebuild_ranking
        consume_pending_events()
        rebuild_ranking(world["season"], "PLAYER")
        rebuild_ranking(world["season"], "CLAN")
        return {"rebuilt": True}
    if action == "b6-daily":
        from apps.daily.services import claim_daily
        claim_daily(player, now)
        return {"claimed": True}
    if action == "b6-avatar":
        from apps.players import group_avatars
        from apps.players.models import GroupAvatar
        from apps.telegram.models import TelegramGroup
        group = TelegramGroup.objects.get(pk=data["group"])
        settings = world["settings"]
        settings.GROUP_IMAGE_CACHE_ENABLED = True
        settings.GROUP_IMAGE_S3_BUCKET = "isolated-private-group-cache"
        settings.GROUP_IMAGE_S3_ENDPOINT_URL = "https://s3.example.test"
        settings.GROUP_IMAGE_S3_ACCESS_KEY_ID = "synthetic-key"
        settings.GROUP_IMAGE_S3_SECRET_ACCESS_KEY = "synthetic-secret"
        group_avatars.S3GroupAvatarStorage = lambda: world["storage"]
        row, _ = GroupAvatar.objects.get_or_create(group=group, defaults={"refresh_after": now})
        row.object_key = "synthetic-sanitized-image.jpg"
        row.expires_at = now + timedelta(hours=1)
        row.refresh_after = now + timedelta(hours=1)
        row.save()
        return {"url": group_avatars.group_avatar_url(group)}
    if action == "b6-invite-deliveries":
        from apps.notifications.models import TelegramDelivery
        return {"private_invites": TelegramDelivery.objects.filter(notification__recipient=player, notification__source_type="CLAN_INVITE").count()}
    member = ClanMembership.objects.select_related("clan_season").get(player=player, ended_at__isnull=True)
    resolved = resolve_game_config_version(member.clan_season.config_version_id)
    if action == "b6-settle":
        from apps.clans.economy import settle_clan_reward
        key = data.get("key") or "paired-b6-" + uuid4().hex
        row, created = settle_clan_reward(membership=member, source_type="CLAN_ACTIVITY", source_id=key, gross_amount=int(data["gross"]), idempotency_key=key, occurred_at=now, resolved_config=resolved)
        return {"id": row.pk, "created": created, "gross": row.gross_amount, "player_amount": row.player_amount, "treasury_amount": row.treasury_amount}
    if action == "b6-missions":
        from django.contrib.auth.models import User
        from django.test import Client
        from apps.clans.models import ClanMissionDefinition
        from apps.clans.tests.test_b6_admin import clan_data, control as admin_control
        operator, _ = User.objects.get_or_create(username="isolated-b6-operator", defaults={"is_superuser": True, "is_staff": True})
        client = Client()
        client.force_login(operator)
        # End prior synthetic QA definitions through the same signed Admin control;
        # preserve progress/history while keeping each sequential browser world isolated.
        for previous in ClanMissionDefinition.objects.filter(key__startswith="paired-b6-", enabled=True):
            if admin_control(client, "clans/clanmissiondefinition", previous).status_code != 302:
                raise RuntimeError("Isolated prior mission deactivation failed")
        rows = []
        for kind, band, title in [("GROUP", "GROUP", "Build the signal together"), ("INDIVIDUAL", "SMALL", "Complete a verified run")]:
            key = "paired-b6-" + kind.lower() + "-" + uuid4().hex[:8]
            description = "Complete verified runs with your Clan." if kind == "GROUP" else "Finish one server-verified Typing run."
            result = client.post("/admin/clans/clanmissiondefinition/add/", clan_data(member.clan_season.config_version, now, key=key, kind=kind, reward_band=band, title=title, description=description, target_units=data.get("target_units", 2 if kind == "GROUP" else 1)))
            if result.status_code != 302:
                raise RuntimeError("Isolated Admin mission creation failed")
            row = ClanMissionDefinition.objects.get(key=key)
            if row.enabled:
                raise RuntimeError("Admin draft unexpectedly activated")
            if data.get("activate", True) and admin_control(client, "clans/clanmissiondefinition", row).status_code != 302:
                raise RuntimeError("Isolated signed Admin activation failed")
            rows.append({"key": key, "title": title, "description": description})
        return {"missions": rows}
    if action == "b6-mission-toggle":
        from django.contrib.auth.models import User
        from django.test import Client
        from apps.clans.models import ClanMissionDefinition
        from apps.clans.tests.test_b6_admin import control as admin_control
        if not data["key"].startswith("paired-b6-"):
            raise ValueError("Only isolated paired mission definitions may be toggled")
        row = ClanMissionDefinition.objects.get(key=data["key"], config_version=member.clan_season.config_version)
        operator = User.objects.get(username="isolated-b6-operator")
        client = Client()
        client.force_login(operator)
        if admin_control(client, "clans/clanmissiondefinition", row).status_code != 302:
            raise RuntimeError("Isolated signed lifecycle transition failed")
        row.refresh_from_db()
        return {"enabled": row.enabled}
    if action == "b6-process-signals":
        from apps.clans.missions import process_mission_signals
        return {"processed": process_mission_signals()}
    if action in {"b6-signal", "b6-capture-signal"}:
        from apps.clans.missions import queue_mission_signal, process_mission_signals
        from apps.clans.models import ClanMissionSignal
        if action == "b6-capture-signal" and world["offset"] != 0:
            raise RuntimeError("Source-time lifecycle cases must precede synthetic expiry clock advances")
        key = data.get("key") or "b6-verified-run-" + uuid4().hex
        queue_mission_signal(membership=member, source_key=key, requirement="VALID_TYPING_RUN", units=1, occurred_at=now)
        if action == "b6-capture-signal":
            row = ClanMissionSignal.objects.get(source_key=key, membership=member)
            return {"key": key, "occurred_at": row.occurred_at.isoformat()}
        ClanMissionSignal.objects.filter(membership=member, processed_at__isnull=True).update(next_attempt_at=now)
        return {"processed": process_mission_signals()}
    raise ValueError("Unknown isolated B6 source control")
