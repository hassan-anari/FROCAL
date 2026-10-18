// Generated from the exact POST-B6 pin's OpenAPI; do not hand-edit.
import { z } from "zod";

export const StateOut = z.object({
  "qa_recreation_authorization_available": z.boolean().optional(),
  "enabled": z.boolean(),
  "eligible": z.boolean(),
  "role": z.union([z.string(), z.null()]),
  "cooldown_until": z.union([z.iso.datetime({ offset: true }), z.null()]),
  "voluntary_leave_count": z.number().int().safe(),
  "unlock_level": z.union([z.number().int().safe(), z.null()]),
  "max_voluntary_leaves": z.number().int().safe(),
  "leave_cooldown_hours": z.number().int().safe(),
  "owner_decisions_pending": z.array(z.string()).optional(),
});
export type StateOut = z.infer<typeof StateOut>;

export const RoleOut = z.object({
  "role": z.string(),
});
export type RoleOut = z.infer<typeof RoleOut>;

export const GroupOut = z.object({
  "id": z.number().int().safe(),
  "title": z.string(),
  "username": z.string(),
  "verification_state": z.enum(["CANDIDATE","VERIFIED"]).optional(),
  "member_count": z.union([z.number().int().safe(), z.null()]).optional(),
  "image_url": z.union([z.string(), z.null()]).optional(),
});
export type GroupOut = z.infer<typeof GroupOut>;

export const ClanOut = z.object({
  "id": z.number().int().safe(),
  "name": z.string(),
  "tag": z.string(),
  "motto": z.string(),
  "member_count": z.number().int().safe(),
  "capacity": z.number().int().safe(),
  "accepting_members": z.boolean(),
  "rank": z.union([z.number().int().safe(), z.null()]).optional(),
  "rank_status": z.enum(["RANKED","UNRANKED","UNAVAILABLE","RECONCILING"]).optional(),
  "level": z.number().int().safe().optional(),
  "score": z.number().int().safe().optional(),
  "state": z.string().optional(),
  "image_url": z.union([z.string(), z.null()]).optional(),
});
export type ClanOut = z.infer<typeof ClanOut>;

export const RequestOut = z.object({
  "id": z.number().int().safe(),
  "state": z.string(),
});
export type RequestOut = z.infer<typeof RequestOut>;

export const OwnRequestOut = z.object({
  "id": z.number().int().safe(),
  "clan_id": z.number().int().safe(),
  "clan_name": z.string(),
  "state": z.string(),
  "created_at": z.iso.datetime({ offset: true }),
  "decided_at": z.union([z.iso.datetime({ offset: true }), z.null()]),
  "invite_state": z.union([z.string(), z.null()]),
  "delivery_state": z.union([z.string(), z.null()]),
  "cancellation_pending": z.boolean(),
  "clan_season_id": z.number().int().safe(),
  "season_id": z.number().int().safe(),
  "season_code": z.string(),
  "is_current_season": z.boolean(),
  "is_active": z.boolean(),
  "reserves_capacity": z.boolean(),
  "credential_unresolved": z.boolean(),
  "blocks_new_application": z.boolean(),
  "handling": z.enum(["CURRENT_SEASON","OPERATOR_REQUIRED","HISTORY"]),
});
export type OwnRequestOut = z.infer<typeof OwnRequestOut>;

export const ApplicantOut = z.object({
  "rank": z.union([z.number().int().safe(), z.null()]).optional(),
  "rank_status": z.enum(["RANKED","UNRANKED","UNAVAILABLE","RECONCILING"]).optional(),
  "current_streak": z.number().int().safe().optional(),
  "request_id": z.number().int().safe(),
  "first_name": z.string(),
  "username": z.string(),
  "level": z.number().int().safe(),
  "season_points": z.number().int().safe(),
  "state": z.string(),
});
export type ApplicantOut = z.infer<typeof ApplicantOut>;

export const MembershipOut = z.object({
  "membership_id": z.number().int().safe(),
  "clan_season_id": z.number().int().safe(),
  "access_rejoin_deadline": z.union([z.iso.datetime({ offset: true }), z.null()]),
  "clan_id": z.number().int().safe(),
  "clan_name": z.string(),
  "role": z.string(),
  "access_state": z.string(),
  "started_at": z.iso.datetime({ offset: true }),
});
export type MembershipOut = z.infer<typeof MembershipOut>;

export const InviteOut = z.object({
  "state": z.string(),
  "invite_link": z.union([z.string(), z.null()]),
  "delivery_state": z.string(),
});
export type InviteOut = z.infer<typeof InviteOut>;

export const ClanHomeOut = z.object({
  "rank": z.union([z.number().int().safe(), z.null()]).optional(),
  "rank_status": z.enum(["RANKED","UNRANKED","UNAVAILABLE","RECONCILING"]).optional(),
  "clan_id": z.number().int().safe(),
  "state": z.string(),
  "hq_level": z.number().int().safe(),
  "hq_xp": z.number().int().safe(),
  "current_threshold": z.number().int().safe(),
  "next_threshold": z.union([z.number().int().safe(), z.null()]),
  "progress_to_next": z.number().int().safe(),
  "max_level": z.boolean(),
  "used_capacity": z.number().int().safe(),
  "accepted_reservations": z.number().int().safe(),
  "effective_capacity": z.number().int().safe(),
  "treasury_balance": z.number().int().safe(),
  "treasury_earned_total": z.number().int().safe(),
  "own_contribution": z.number().int().safe(),
  "total_contribution": z.number().int().safe(),
  "competitive_score": z.number().int().safe(),
});
export type ClanHomeOut = z.infer<typeof ClanHomeOut>;

export const ContributionOut = z.object({
  "first_name": z.string(),
  "username": z.string(),
  "role": z.string(),
  "contribution": z.number().int().safe(),
});
export type ContributionOut = z.infer<typeof ContributionOut>;

export const TreasuryEntryOut = z.object({
  "direction": z.string(),
  "amount": z.number().int().safe(),
  "source_type": z.string(),
  "occurred_at": z.iso.datetime({ offset: true }),
});
export type TreasuryEntryOut = z.infer<typeof TreasuryEntryOut>;

export const TreasuryOut = z.object({
  "balance": z.number().int().safe(),
  "earned_total": z.number().int().safe(),
  "history": z.array(TreasuryEntryOut),
});
export type TreasuryOut = z.infer<typeof TreasuryOut>;

export const EffectRuleOut = z.object({
  "category": z.string(),
  "value": z.number().int().safe(),
});
export type EffectRuleOut = z.infer<typeof EffectRuleOut>;

export const ItemRuleOut = z.object({
  "item_id": z.string(),
  "name": z.string(),
  "price": z.number().int().safe(),
  "activation": z.union([z.string(), z.null()]),
  "duration_minutes": z.union([z.number().int().safe(), z.null()]),
  "effects": z.array(EffectRuleOut),
  "quantity": z.number().int().safe(),
  "max_uses_per_season": z.union([z.number().int().safe(), z.null()]),
  "uses_this_season": z.number().int().safe(),
  "can_purchase": z.boolean(),
  "can_activate": z.boolean(),
  "blocked_reason": z.union([z.string(), z.null()]),
});
export type ItemRuleOut = z.infer<typeof ItemRuleOut>;

export const EffectOut = z.object({
  "id": z.number().int().safe(),
  "item_id": z.string(),
  "category": z.string(),
  "value": z.number().int().safe(),
  "starts_at": z.iso.datetime({ offset: true }),
  "expires_at": z.iso.datetime({ offset: true }),
  "effective": z.boolean(),
});
export type EffectOut = z.infer<typeof EffectOut>;

export const EquipmentOut = z.object({
  "config_version": z.string(),
  "server_time": z.iso.datetime({ offset: true }),
  "items": z.array(ItemRuleOut),
  "active_effects": z.array(EffectOut),
});
export type EquipmentOut = z.infer<typeof EquipmentOut>;

export const InventoryOut = z.object({
  "item_id": z.string(),
  "quantity": z.number().int().safe(),
});
export type InventoryOut = z.infer<typeof InventoryOut>;

export const ShopItemOut = z.object({
  "item_id": z.string(),
  "name": z.string(),
  "price": z.number().int().safe(),
  "activation": z.string(),
  "available": z.boolean(),
});
export type ShopItemOut = z.infer<typeof ShopItemOut>;

export const MutationOut = z.object({
  "id": z.number().int().safe(),
  "replayed": z.boolean(),
});
export type MutationOut = z.infer<typeof MutationOut>;

export const ClanMissionOut = z.object({
  "title": z.string().optional(),
  "description": z.string().optional(),
  "key": z.string(),
  "version": z.number().int().safe(),
  "kind": z.string(),
  "target_units": z.number().int().safe(),
  "reward_band": z.string(),
  "starts_at": z.iso.datetime({ offset: true }),
  "ends_at": z.iso.datetime({ offset: true }),
  "progress_units": z.number().int().safe(),
  "completed": z.boolean(),
  "requirement": z.string(),
  "availability": z.enum(["AVAILABLE","UNAVAILABLE"]),
  "blocked_reason": z.union([z.string(), z.null()]),
  "participant_gross_points": z.union([z.number().int().safe(), z.null()]),
  "direct_hq_xp": z.union([z.number().int().safe(), z.null()]),
  "reward_state": z.string(),
  "own_player_reward": z.union([z.number().int().safe(), z.null()]),
});
export type ClanMissionOut = z.infer<typeof ClanMissionOut>;

export const TrophyOut = z.object({
  "key": z.string(),
  "current": z.union([z.number().int().safe(), z.null()]),
  "target": z.union([z.number().int().safe(), z.null()]),
  "unlocked": z.boolean(),
  "unlocked_at": z.union([z.iso.datetime({ offset: true }), z.null()]),
  "available": z.boolean(),
  "blocked_reason": z.union([z.string(), z.null()]).optional(),
});
export type TrophyOut = z.infer<typeof TrophyOut>;

export const GovernanceOut = z.object({
  "id": z.number().int().safe(),
  "case_type": z.string(),
  "status": z.string(),
  "voting_deadline": z.iso.datetime({ offset: true }),
  "quorum_bps": z.number().int().safe(),
  "approval_bps": z.number().int().safe(),
  "minimum_eligible_voters": z.number().int().safe(),
  "eligible_count": z.number().int().safe(),
  "reason": z.string(),
  "target_membership_id": z.union([z.number().int().safe(), z.null()]),
  "target_first_name": z.union([z.string(), z.null()]),
  "target_username": z.union([z.string(), z.null()]),
  "is_eligible_voter": z.boolean(),
  "own_vote": z.union([z.string(), z.null()]),
  "yes_count": z.union([z.number().int().safe(), z.null()]),
  "no_count": z.union([z.number().int().safe(), z.null()]),
  "valid_cast_count": z.union([z.number().int().safe(), z.null()]),
  "result": z.union([z.string(), z.null()]),
});
export type GovernanceOut = z.infer<typeof GovernanceOut>;

export const DissolutionCapabilityOut = z.object({
  "can_open": z.boolean(),
  "blocked_reason": z.union([z.string(), z.null()]),
  "eligible_count": z.number().int().safe(),
  "existing_case_id": z.union([z.number().int().safe(), z.null()]),
  "direct": z.boolean(),
  "outcome": z.enum(["IMMEDIATE","VOTE_REQUIRED","BLOCKED"]),
  "same_season_recreation_allowed": z.literal(false).optional(),
  "confirmation_warning": z.string(),
});
export type DissolutionCapabilityOut = z.infer<typeof DissolutionCapabilityOut>;

export const RemovalCapabilityOut = z.object({
  "can_open": z.boolean(),
  "blocked_reason": z.union([z.string(), z.null()]),
  "eligible_count": z.number().int().safe(),
  "existing_case_id": z.union([z.number().int().safe(), z.null()]),
  "target_membership_id": z.number().int().safe(),
});
export type RemovalCapabilityOut = z.infer<typeof RemovalCapabilityOut>;

export const GovernanceCapabilitiesOut = z.object({
  "config_version": z.string(),
  "config_checksum": z.string(),
  "minimum_eligible_voters": z.number().int().safe(),
  "quorum_bps": z.number().int().safe(),
  "approval_bps": z.number().int().safe(),
  "vote_duration_hours": z.number().int().safe(),
  "dissolution": DissolutionCapabilityOut,
  "removal_targets": z.array(RemovalCapabilityOut),
});
export type GovernanceCapabilitiesOut = z.infer<typeof GovernanceCapabilitiesOut>;

export const RecoveryOut = z.object({
  "governance": z.union([GovernanceCapabilitiesOut, z.null()]).optional(),
  "reasons": z.array(z.string()),
  "captain_authority_lost_at": z.union([z.iso.datetime({ offset: true }), z.null()]),
  "can_verify_authority": z.boolean(),
  "state": z.string(),
  "reason": z.string(),
  "started_at": z.union([z.iso.datetime({ offset: true }), z.null()]),
  "bot_admin_restore_deadline": z.union([z.iso.datetime({ offset: true }), z.null()]),
  "home_integrity_available": z.boolean(),
});
export type RecoveryOut = z.infer<typeof RecoveryOut>;

export const RosterMemberOut = z.object({
  "membership_id": z.number().int().safe(),
  "player_id": z.number().int().safe(),
  "first_name": z.string(),
  "username": z.string(),
  "level": z.union([z.number().int().safe(), z.null()]),
  "avatar_url": z.string(),
  "role": z.enum(["CAPTAIN","SOLDIER"]),
  "access_state": z.string(),
  "contribution": z.number().int().safe(),
  "started_at": z.iso.datetime({ offset: true }),
  "own": z.boolean(),
});
export type RosterMemberOut = z.infer<typeof RosterMemberOut>;

export const RosterPage = z.object({
  "items": z.array(RosterMemberOut),
  "total_count": z.number().int().safe(),
  "next_offset": z.union([z.number().int().safe(), z.null()]),
});
export type RosterPage = z.infer<typeof RosterPage>;

export const RoleIn = z.object({
  "role": z.enum(["CAPTAIN","SOLDIER"]),
});
export type RoleIn = z.infer<typeof RoleIn>;

export const ClanCreateIn = z.object({
  "telegram_group_id": z.number().int().safe().gt(0),
  "name": z.string().min(2).max(64),
  "tag": z.string().min(2).max(12),
  "motto": z.string().max(160).optional(),
});
export type ClanCreateIn = z.infer<typeof ClanCreateIn>;

export const DecisionIn = z.object({
  "accept": z.boolean(),
});
export type DecisionIn = z.infer<typeof DecisionIn>;

export const RemovalCaseIn = z.object({
  "target_membership_id": z.number().int().safe(),
  "reason": z.string(),
});
export type RemovalCaseIn = z.infer<typeof RemovalCaseIn>;

export const VoteIn = z.object({
  "choice": z.enum(["YES","NO"]),
});
export type VoteIn = z.infer<typeof VoteIn>;

export const IdempotencyIn = z.object({
  "idempotency_key": z.string().min(1).max(200),
});
export type IdempotencyIn = z.infer<typeof IdempotencyIn>;

export const ClanActivityOut = z.object({
  "id": z.string(),
  "event_type": z.enum(["CLAN_REWARD_SETTLED","MISSION_COMPLETED","TREASURY_CREDIT","TREASURY_DEBIT","ITEM_PURCHASED","ITEM_ACTIVATED","MEMBER_JOINED"]),
  "occurred_at": z.iso.datetime({ offset: true }),
  "recorded_at": z.union([z.iso.datetime({ offset: true }), z.null()]).optional(),
  "actor_name": z.union([z.string(), z.null()]).optional(),
  "amount": z.union([z.number().int().safe(), z.null()]).optional(),
  "unit": z.union([z.enum(["PLAYER_POINTS","TREASURY_CREDITS"]), z.null()]).optional(),
  "treasury_amount": z.union([z.number().int().safe(), z.null()]).optional(),
  "contribution_amount": z.union([z.number().int().safe(), z.null()]).optional(),
  "item_id": z.union([z.string(), z.null()]).optional(),
  "mission_key": z.union([z.string(), z.null()]).optional(),
  "mission_version": z.union([z.number().int().safe(), z.null()]).optional(),
});
export type ClanActivityOut = z.infer<typeof ClanActivityOut>;

export const ClanActivityPage = z.object({
  "items": z.array(ClanActivityOut),
  "next_cursor": z.union([z.string(), z.null()]),
  "as_of": z.iso.datetime({ offset: true }),
});
export type ClanActivityPage = z.infer<typeof ClanActivityPage>;
