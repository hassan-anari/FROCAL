"""Successor-only isolated setup, through real operator/domain paths. Never deployed."""
from datetime import timedelta
from io import StringIO
from uuid import uuid4
from unittest.mock import patch
from threading import Lock

operator_stdin_lock = Lock()


def control(data, world):
    from django.contrib.auth.models import Permission, User
    from django.core.management import call_command
    from django.db import connection, transaction
    from apps.players.models import Player
    from apps.clans.models import ClanSeason
    from apps.seasons.models import Season, ClanSeasonFinalStanding, SeasonCloseRun
    from apps.seasons.services import archive_closed_season
    from apps.arena.services import rebuild_ranking

    player = Player.objects.get(telegram_user_id=int(data["player"]))
    if data["action"] == "post-b6-qa-grant":
        operator, _ = User.objects.get_or_create(username="isolated-post-b6-qa-operator")
        operator.user_permissions.add(Permission.objects.get(codename="grant_qa_clan_recreation"))
        # Exercise the published stdin command, not an API grant or direct table insert.
        with operator_stdin_lock, patch("sys.stdin", StringIO(str(player.telegram_user_id) + "\n")):
            call_command("grant_qa_clan_recreation", telegram_user_id_stdin=True,
                         actor=operator.username, season=world["season"].code,
                         reason="Synthetic owner-approved paired QA recreation",
                         ticket_reference="isolated-paired-approval", stdout=StringIO())
        return {"granted": True}
    if data["action"] == "post-b6-archive":
        original = ClanSeason.objects.get(captain=player, season=world["season"])
        now = world["now"]()
        historical = Season.objects.create(code="paired-archive-" + uuid4().hex[:12], title="Isolated historical Season",
                                          starts_at=now - timedelta(days=90), ends_at=now - timedelta(days=60), baseline_config=original.config_version)
        old = ClanSeason.objects.create(clan=original.clan, captain=player, season=historical,
                                       config_version=original.config_version, base_capacity=original.base_capacity,
                                       state="ENDED", competitive_score=999)
        ClanSeasonFinalStanding.objects.create(season=historical, clan_season=old, clan=original.clan,
                                               final_rank=1, final_competitive_score=123, score_reached_at=historical.ends_at,
                                               ranking_generation=1, ranked_population=1, provenance={}, finalized_at=now)
        # Same guarded transition capability used by WEDCAL's historical snapshot fixture.
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SELECT set_config('dexo.season_transition', 'on', true)")
            historical.status = "CLOSED"
            historical.save(update_fields=("status", "updated_at"))
            with connection.cursor() as cursor:
                cursor.execute("SELECT set_config('dexo.season_transition', 'off', true)")
        operator, _ = User.objects.get_or_create(username="isolated-archive-operator", defaults={"is_superuser": True, "is_staff": True})
        SeasonCloseRun.objects.create(season=historical, stage="COMPLETED", cutoff_at=historical.ends_at,
                                      actor=operator, reason="Synthetic archive", idempotency_key=uuid4().hex)
        historical = archive_closed_season(historical, actor=operator, reason="Synthetic paired archive")
        rebuild_ranking(historical, "CLAN")
        return {"season": historical.code, "clan_id": str(old.pk), "score": 123}
    raise ValueError("Unknown isolated successor control")
