import { Button } from "@/design-system/primitives/Button";
import { clanActivityRows, clanActivityView } from "@/integrations/api/clanActivity";
import type { ClanRemote } from "@/integrations/api/useClanRemote";
import { ClanQueryState } from "./ClanQueryState";
import styles from "@/pages/ClanPage.module.css";

export function ClanRecentActivity({ live }: { live: ClanRemote }) {
  const feed = live.activity;
  const rows = clanActivityRows(feed.data?.pages);
  const retry = () => feed.isFetchNextPageError ? feed.fetchNextPage({ cancelRefetch: false }) : feed.refetch({ cancelRefetch: false });
  return <>
    {feed.isPending ? <ClanQueryState loading title="Checking recent Clan activity…" /> : null}
    {feed.isError ? <ClanQueryState title="Recent activity couldn't refresh." description={rows.length ? "Showing the last confirmed events." : "Retry to load Clan activity."} retry={retry} busy={feed.isFetching} /> : null}
    {!feed.isPending && !feed.isError && !rows.length ? <ClanQueryState title="No recent activity yet" description="Verified membership, mission and Clan events will appear here." /> : null}
    <div className={styles.activityList}>
      {rows.map(row => { const view = clanActivityView(row, live.equipment.data?.items); return <article key={row.id} data-activity-id={row.id}><span><time dateTime={row.occurred_at} title={new Date(row.occurred_at).toLocaleString("en-US")}>{new Date(row.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}<br />{new Date(row.occurred_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</time></span><div><strong>{view.title}</strong><p>{view.description}</p></div></article>; })}
    </div>
    {feed.hasNextPage && !feed.isFetchNextPageError ? <Button size="sm" tone="secondary" disabled={feed.isFetching} onClick={() => void feed.fetchNextPage({ cancelRefetch: false })}>{feed.isFetchingNextPage ? "Loading earlier activity…" : "Earlier activity"}</Button> : null}
  </>;
}
