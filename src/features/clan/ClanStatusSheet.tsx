import { useEffect, useState } from "react";
import { ClanModal } from "./ClanOverlays";
import { Button } from "@/design-system/primitives/Button";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { applicationStatusMessage } from "@/integrations/api/clanApplications";
import { safeDestination } from "@/integrations/api/safeNavigation";
import type { ClanRemote } from "@/integrations/api/useClanRemote";
import type { InviteOut } from "@/integrations/api/b5Schemas";
import styles from "./ClanOverlays.module.css";
import { ClanQueryState } from "./ClanQueryState";
import { clanStatusLabel as words, invitationLabel } from "./clanStatusLabels";
const removalReasons = ["ABUSIVE_BEHAVIOR", "SPAM", "HARASSMENT", "SABOTAGE", "COMMUNITY_REASON", "OTHER"] as const;
const time = (value: string | null | undefined) => value ? new Date(value).toLocaleString("en-US") : "—";
/** Owner-approved extension of the existing ClanModal, using backend state and rules only. */
export function ClanStatusSheet({ live, onClose }: { live: ClanRemote; onClose: () => void }) {
  const { adapter } = useTelegram();
  const [mode, setMode] = useState<"status" | "leave" | "dissolve" | "removal">("status");
  const [dissolutionAcknowledged, setDissolutionAcknowledged] = useState(false);
  useEffect(() => { setDissolutionAcknowledged(false); }, [mode, live.membership.data?.membership_id]);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  // Disposable credentials are deliberately excluded from Query/localStorage/sessionStorage.
  const [invite, setInvite] = useState<{ owner: string; credential: InviteOut } | null>(null);
  const state = live.state.data;
  const member = live.member ? live.membership.data : null;
  const request = live.activeRequest;
  const displayRequest = request ?? live.operatorRequest;
  const captain = member?.role === "CAPTAIN";
  const busy = live.pending !== null;
  const stale = live.state.isError || live.membership.isError;
  const leaveAllowed = !stale && member?.role === "SOLDIER" && state !== undefined && state.voluntary_leave_count < state.max_voluntary_leaves;
  const activeRequest = request !== null && live.applicationProblem === null;
  const needsInvite = live.applicationProblem === null && (request?.state === "ACCEPTED" || member?.access_state === "ACCESS_LOST");
  const inviteOwner = needsInvite ? `${live.scopeKey}:${request ? `request:${request.id}:${request.clan_id}:${request.clan_season_id}:${request.season_id}:${request.handling}:${request.invite_state}:${request.cancellation_pending}` : `member:${member!.membership_id}:${member!.clan_id}`}` : null;
  const credential = invite?.owner === inviteOwner ? invite.credential : null;
  const destination = credential?.state === "ACTIVE" && !request?.cancellation_pending ? safeDestination(credential.invite_link) : null;
  useEffect(() => { setInvite(null); }, [inviteOwner]);
  const complete = async (action: string, operation: () => Promise<unknown>) => { if (await live.run(action, operation) !== undefined) { setInvite(null); setMode("status"); } };
  if (mode !== "status") return (
    <ClanModal eyebrow="Clan governance" title={mode === "leave" ? "Leave Clan" : mode === "dissolve" ? "Request dissolution" : "Propose member removal"} onClose={onClose} footer={
      <div className={styles.doubleActions}>
        <Button size="sm" tone="secondary" onClick={() => setMode("status")} disabled={busy}>{mode === "dissolve" ? "Cancel" : "Go back"}</Button>
        <Button size="sm" className={mode === "dissolve" ? styles.destructiveAction : undefined} disabled={busy || (mode === "dissolve" && !dissolutionAcknowledged) || (mode === "leave" && !leaveAllowed) || (mode === "removal" && (!target || !reason.trim()))} onClick={() => void complete(mode, () => mode === "leave" ? live.api.leave() : mode === "dissolve" ? live.api.dissolve() : live.api.removalCase({ target_membership_id: Number(target), reason: reason.trim() }))}>Confirm</Button>
      </div>
    }>
      <div className={styles.centerCopy}>
        <strong>{mode === "leave" ? "Your historical contribution stays with this Clan." : mode === "dissolve" ? "Your Clan may dissolve immediately without voting. If a vote is required, confirmation opens a governance case." : "A proposal opens a governed removal case. It does not immediately remove a member."}</strong>
        {mode === "dissolve" ? <div className={styles.destructiveWarning}>
          <strong>If your Clan dissolves, you cannot create another Clan as Captain during the current Season.</strong>
          <label><input type="checkbox" checked={dissolutionAcknowledged} onChange={event => setDissolutionAcknowledged(event.target.checked)} />I understand the current-Season recreation restriction.</label>
        </div> : null}
        {mode === "leave" ? <p>Join cooldown: {state?.leave_cooldown_hours ?? "—"} hours. Leaves used: {state?.voluntary_leave_count ?? "—"} / {state?.max_voluntary_leaves ?? "—"}.</p> : null}
      </div>
      {mode === "removal" ? <div className={`${styles.detailList} ${styles.governanceForm}`}>
        <label>Member <select aria-label="Member" value={target} onChange={event => setTarget(event.target.value)}><option value="">Select a member</option>{live.rosterRows.filter(row => row.role === "SOLDIER" && !row.own).map(row => <option key={row.membership_id} value={row.membership_id}>{row.first_name || row.username}</option>)}</select></label>
        <label>Reason <select aria-label="Reason" value={reason} onChange={event => setReason(event.target.value)}><option value="">Select a reason</option>{removalReasons.map(value => <option key={value} value={value}>{words(value)}</option>)}</select></label>
        {live.roster.hasNextPage ? <Button size="sm" tone="secondary" disabled={live.roster.isFetching} onClick={() => void live.roster.fetchNextPage()}>Load more members</Button> : null}
      </div> : null}
    </ClanModal>
  );
  return (
    <ClanModal eyebrow="Clan membership and governance" title="Clan status" onClose={onClose}>
      <div className={styles.detailList}>
        <div><span>Role</span><strong>{words(state?.role)}</strong></div>
        <div><span>Membership</span><strong>{member ? words(member.access_state) : "No active membership"}</strong></div>
        {displayRequest ? <><div><span>Join request</span><strong>{words(displayRequest.state)}</strong></div><div><span>Clan</span><strong>{displayRequest.clan_name}</strong></div>{!displayRequest.is_current_season ? <div><span>Season</span><strong>{displayRequest.season_code}</strong></div> : null}{displayRequest.state === "ACCEPTED" ? <div><span>Invitation</span><strong>{invitationLabel(displayRequest.invite_state)}</strong></div> : null}{displayRequest.cancellation_pending ? <div><span>Cancellation</span><strong>In progress · your place stays reserved</strong></div> : null}</> : null}
        {state?.cooldown_until ? <div><span>Join cooldown until</span><strong>{time(state.cooldown_until)}</strong></div> : null}
        {member?.access_rejoin_deadline ? <div><span>Access recovery deadline</span><strong>{time(member.access_rejoin_deadline)}</strong></div> : null}
        {live.recovery.data ? <><div><span>Clan state</span><strong>{words(live.recovery.data.state)}</strong></div>{live.recovery.data.reasons.length ? <div><span>Recovery</span><strong>{live.recovery.data.reasons.map(words).join(" · ")}</strong></div> : null}<div><span>Group access</span><strong>{live.recovery.data.home_integrity_available ? "Available" : "Admin permissions need restoring"}</strong></div>{live.recovery.data.captain_authority_lost_at ? <div><span>Captain permissions changed</span><strong>{time(live.recovery.data.captain_authority_lost_at)}</strong></div> : null}{live.recovery.data.started_at ? <div><span>Recovery started</span><strong>{time(live.recovery.data.started_at)}</strong></div> : null}{live.recovery.data.bot_admin_restore_deadline ? <div><span>Admin recovery deadline</span><strong>{time(live.recovery.data.bot_admin_restore_deadline)}</strong></div> : null}</> : null}
      </div>
      {live.applicationProblem ? <ClanQueryState loading={live.applicationProblem === "loading"} title={applicationStatusMessage[live.applicationProblem]} /> : null}
      {request?.state === "ACCEPTED" && !member ? <p className={styles.note}>Acceptance reserves a place. Membership activates after your Telegram group membership is verified.</p> : null}
      {needsInvite ? <div className={`${styles.detailList} ${styles.statusControls}`}>
        <Button size="sm" tone="secondary" disabled={busy || stale} onClick={() => { setInvite(null); void live.run("invite", () => live.api.invite()).then(value => { if (value && inviteOwner) setInvite({ owner: inviteOwner, credential: value }); }); }}>Check invite and access</Button>
        {credential ? <div role="status"><span>Group invitation</span><strong>{invitationLabel(credential.state)}</strong></div> : null}
        {destination?.kind === "telegram" ? <Button size="sm" onClick={() => adapter.openTelegramLink(destination.url)}>Open Telegram group</Button> : null}
      </div> : null}
      <div className={styles.doubleActions}>
        <Button size="sm" tone="secondary" disabled={busy} onClick={() => { setInvite(null); void live.refresh(); }}>Refresh status</Button>
        {captain && live.recovery.data?.can_verify_authority && !live.recovery.data.home_integrity_available ? <Button size="sm" tone="secondary" disabled={busy || stale || live.recovery.isError} onClick={() => void complete("verify-authority", () => live.api.verifyAuthority())}>Verify Telegram authority</Button> : null}
        {activeRequest && !member ? <Button size="sm" tone="secondary" disabled={busy || stale || request.cancellation_pending} onClick={() => void complete("cancel", () => live.api.cancelRequest(request.id))}>Cancel request</Button> : null}
        {member?.role === "SOLDIER" ? <Button size="sm" tone="secondary" disabled={busy || !leaveAllowed} onClick={() => setMode("leave")}>Leave Clan</Button> : null}
        {captain ? <><Button size="sm" tone="secondary" disabled={busy || stale || live.roster.isError || live.rosterRows.filter(row => row.role === "SOLDIER").length === 0} onClick={() => setMode("removal")}>Propose removal</Button><Button size="sm" tone="secondary" disabled={busy || stale || live.recovery.isError || live.recovery.data?.state !== "ACTIVE"} onClick={() => setMode("dissolve")}>Request dissolution</Button></> : null}
      </div>
      {live.requestHistory.length ? <div className={styles.detailList} aria-label="Clan request history">
        <div><span>Request history</span><strong>{live.requestHistory.length}</strong></div>
        {live.requestHistory.map(row => <div key={row.id}><span>{row.clan_name}</span><strong>{words(row.state)} · {time(row.decided_at ?? row.created_at)}</strong></div>)}
      </div> : null}
      {(member ? live.governance.data ?? [] : []).map(governance => <section key={governance.id} className={styles.detailList}>
        <div><span>{words(governance.case_type)}</span><strong>{words(governance.status)}</strong></div>
        <p className={styles.note}>{/^[A-Z_]+$/.test(governance.reason) ? words(governance.reason) : governance.reason}</p>
        {governance.target_membership_id !== null ? <div><span>Member</span><strong>{governance.target_first_name || governance.target_username || "—"}</strong></div> : null}
        <div><span>Deadline</span><strong>{time(governance.voting_deadline)}</strong></div>
        <div><span>Eligible voters</span><strong>{governance.eligible_count}</strong></div>
        <div><span>Quorum</span><strong>{governance.quorum_bps / 100}%</strong></div>
        <div><span>Approval</span><strong>{governance.approval_bps / 100}%</strong></div>
        <div><span>Minimum voters</span><strong>{governance.minimum_eligible_voters}</strong></div>
        <div><span>Your vote</span><strong>{words(governance.own_vote)}</strong></div>
        {governance.yes_count !== null ? <div><span>Final votes</span><strong>{governance.yes_count} yes · {governance.no_count} no</strong></div> : null}
        {governance.result ? <div><span>Result</span><strong>{words(governance.result)}</strong></div> : null}
        {governance.status === "OPEN" ? <div className={styles.doubleActions}>{(["YES", "NO"] as const).map(choice => <Button key={choice} size="sm" tone="secondary" disabled={busy || stale || live.governance.isError || !governance.is_eligible_voter || Boolean(governance.own_vote)} onClick={() => void complete(`vote:${governance.id}`, () => live.api.vote(governance.id, { choice }))}>Vote {choice.toLowerCase()}</Button>)}</div> : null}
      </section>)}
      {(member && (live.governance.isError || live.recovery.isError)) || stale ? <ClanQueryState title="Clan status couldn't load fully." description="Retry before taking another action." retry={live.refresh} busy={live.governance.isFetching || live.recovery.isFetching || live.membership.isFetching} /> : member && (live.governance.isPending || live.recovery.isPending) ? <ClanQueryState loading title="Checking Clan status…" /> : null}
    </ClanModal>
  );
}
