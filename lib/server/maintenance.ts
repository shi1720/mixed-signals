import { CAMPAIGN } from '../campaign';
import { snapshotStatement } from './aggregation';
/** Traffic-driven retention: no scheduler or external secret is necessary.
 * Every public status request checks the deadline. The first request after the
 * retention date freezes the release and deletes raw records in one transaction.
 * Operators can run the same function from a scheduled Worker if desired. */
export async function maintainRetention(db: D1Database) {
  const cutoff =
    Date.parse(CAMPAIGN.revealsAt) / 1000 + CAMPAIGN.rawRetentionDays * 86400;
  if (Date.now() / 1000 < cutoff) return;
  await db.batch([
    snapshotStatement(db),
    db
      .prepare(
        'DELETE FROM submissions WHERE campaign_id=? AND unixepoch()>=? AND EXISTS(SELECT 1 FROM snapshots WHERE campaign_id=?)',
      )
      .bind(CAMPAIGN.id, cutoff, CAMPAIGN.id),
    db.prepare('DELETE FROM rate_limits WHERE expires_at<unixepoch()'),
  ]);
}
