"""Isolated B5 test setup at external Telegram/source boundaries. No fake API routes.
Only used by b2_server with an explicitly isolated frocal_b5_ PostgreSQL database.
"""
from uuid import uuid4
from datetime import timedelta
from apps.telegram import bot_api
from apps.telegram.bot_api import TelegramResult
from apps.telegram.models import TelegramGroup, TelegramGroupCandidate
from apps.players.models import Player
from apps.clans.models import ClanMembership

roles = {}
mode = "ok"

def install(world):
    world["settings"].TELEGRAM_BOT_ID = 123456
    def member(chat, user):
        if mode == "unavailable":
            return TelegramResult(ok=False, category="unavailable")
        status = roles.get((chat, user), "administrator" if user == 123456 else "left")
        return TelegramResult(ok=True, result={"user": {"id": user}, "status": status, "can_invite_users": status == "administrator"})
    bot_api.get_chat_member = member
    bot_api.create_chat_invite_link = lambda *_a, **_k: TelegramResult(ok=True, result={"invite_link": "https://t.me/+" + uuid4().hex})
    bot_api.revoke_chat_invite_link = lambda *_a, **_k: TelegramResult(ok=True, result=True)
    bot_api.send_message = lambda *_a, **_k: TelegramResult(ok=True, result={"message_id": 1})


def control(data, world):
    global mode
    action, now = data["action"], world["now"]()
    if action == "b5-transport":
        mode = data.get("mode", "ok")
        return {"ok": True}
    player = Player.objects.get(telegram_user_id=int(data["player"]))
    if action == "b5-group":
        group = TelegramGroup.objects.create(telegram_chat_id=-int(uuid4().hex[:10], 16), chat_type="supergroup", title="Paired Clan home", bot_membership_status="administrator", bot_is_admin=True, bot_can_invite_users=True, is_monitored=True, first_seen_at=now, last_seen_at=now)
        TelegramGroupCandidate.objects.create(group=group, telegram_user_id=player.telegram_user_id, player=player, observed_at=now)
        roles[group.telegram_chat_id, player.telegram_user_id] = "administrator"
        return {"id": group.pk}
    if action == "b5-authority":
        group = TelegramGroup.objects.get(pk=data["group"])
        roles[group.telegram_chat_id, player.telegram_user_id] = "administrator" if data["admin"] else "member"
        return {"ok": True}
    if action == "b5-presence":
        from apps.clans.services import reconcile_telegram_membership
        group = TelegramGroup.objects.get(pk=data["group"])
        roles[group.telegram_chat_id, player.telegram_user_id] = "member" if data.get("present", True) else "left"
        reconcile_telegram_membership(player=player, group=group, present=data.get("present", True), telegram_update_id=int(uuid4().hex[:10], 16), observed_at=now, fresh_verified_at=now)
        return {"ok": True}
    member = ClanMembership.objects.select_related("clan_season").get(player=player, ended_at__isnull=True)
    if action == "b5-mission":
        from apps.clans.models import ClanMissionDefinition
        definition = ClanMissionDefinition.objects.create(key="paired-typing-" + uuid4().hex[:8], version=1, kind="INDIVIDUAL", requirement="VALID_TYPING_RUN", target_units=1, reward_band="SMALL", starts_at=now - timedelta(minutes=1), ends_at=now + timedelta(hours=1), enabled=True, config_version=world["config"])
        return {"key": definition.key}
    if action == "b5-mission-progress":
        from apps.clans.missions import queue_mission_signal, process_mission_signals
        from apps.clans.models import ClanMissionSignal
        queue_mission_signal(membership=member, source_key="paired-source-" + str(member.pk), requirement="VALID_TYPING_RUN", units=1, occurred_at=now)
        # The shared isolated harness controls timezone.now; model default callables
        # were imported before that clock. Schedule this source on the same test clock.
        ClanMissionSignal.objects.filter(membership=member, processed_at__isnull=True).update(next_attempt_at=now)
        return {"processed": process_mission_signals()}
    if action == "b5-reward":
        from apps.clans.economy import settle_clan_reward
        result, created = settle_clan_reward(membership=member, source_type="CLAN_ACTIVITY", source_id="isolated-paired-source", gross_amount=100000, idempotency_key="paired-source:" + str(member.pk), occurred_at=now, resolved_config=world["resolve_effective_game_config"](now))
        return {"id": result.pk, "created": created}
    if action == "b5-captain-authority":
        from apps.clans.recovery import observe_captain_authority
        group = member.clan_season.clan.telegram_group
        roles[group.telegram_chat_id, player.telegram_user_id] = "administrator" if data["admin"] else "member"
        if not data["admin"]:
            observe_captain_authority(member.clan_season_id, has_authority=False, authoritative=True, observed_at=now)
        return {"ok": True}
    if action == "b5-bot-admin":
        from apps.clans.governance import observe_bot_admin_state
        roles[member.clan_season.clan.telegram_group.telegram_chat_id, 123456] = "administrator" if data["admin"] else "member"
        cs = observe_bot_admin_state(member.clan_season_id, is_admin=data["admin"], authoritative=True, observed_at=now)
        return {"state": cs.state}
    if action == "b5-finalize":
        from apps.clans.governance import finalize_case
        case = finalize_case(data["case"], now=now)
        return {"status": case.status}
    raise ValueError("Unknown B5 boundary control")
