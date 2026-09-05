import { CAMPAIGN } from '../campaign';
import { forecastLabel, type CityResult } from '../forecast';
/** One SQL statement freezes the full release atomically. Suppression is applied
 * before JSON crosses the storage boundary. No private rows enter API responses. */
export const SNAPSHOT_SQL = `
 INSERT INTO snapshots(campaign_id,payload,created_at)
 SELECT ?, COALESCE((
  WITH grouped AS (
   SELECT city_id,COUNT(*) AS n,
    COUNT((spark + authenticity + hope)) AS chemistry_n,
    AVG((spark + authenticity + hope - 3)*25.0/3.0) AS chemistry,
    COUNT((clarity + ghosting)) AS fog_n,
    AVG((4 - clarity + ghosting)*25.0/2.0) AS fog,
    COUNT((follow_through + affordability + logistics)) AS friction_n,
    AVG((9 - follow_through - affordability + logistics)*25.0/3.0) AS friction
   FROM submissions WHERE campaign_id=? GROUP BY city_id HAVING COUNT(*)>=?
  )
  SELECT json_group_array(json_object(
   'cityId',city_id,'n',n,
   'chemistry',json_object('value',CASE WHEN chemistry_n>=? THEN ROUND(chemistry/5.0)*5 ELSE NULL END,'n',CASE WHEN chemistry_n>=? THEN chemistry_n ELSE 0 END),
   'fog',json_object('value',CASE WHEN fog_n>=? THEN ROUND(fog/5.0)*5 ELSE NULL END,'n',CASE WHEN fog_n>=? THEN fog_n ELSE 0 END),
   'friction',json_object('value',CASE WHEN friction_n>=? THEN ROUND(friction/5.0)*5 ELSE NULL END,'n',CASE WHEN friction_n>=? THEN friction_n ELSE 0 END),
   'habitat',(SELECT habitat FROM submissions AS h WHERE h.campaign_id=? AND h.city_id=grouped_city.city_id GROUP BY habitat HAVING COUNT(*)>=? ORDER BY COUNT(*) DESC,habitat ASC LIMIT 1)
  )) FROM (SELECT * FROM grouped ORDER BY city_id) AS grouped_city
 ),'[]'),unixepoch()
 WHERE unixepoch()>=? AND NOT EXISTS(SELECT 1 FROM snapshots WHERE campaign_id=?) ON CONFLICT(campaign_id) DO NOTHING`;
export function snapshotStatement(db: D1Database) {
  const min = CAMPAIGN.minimumMetricSample;
  return db
    .prepare(SNAPSHOT_SQL)
    .bind(
      CAMPAIGN.id,
      CAMPAIGN.id,
      CAMPAIGN.minimumCitySample,
      min,
      min,
      min,
      min,
      min,
      min,
      CAMPAIGN.id,
      min,
      Date.parse(CAMPAIGN.revealsAt) / 1000,
      CAMPAIGN.id,
    );
}
export async function readSnapshot(db: D1Database): Promise<CityResult[]> {
  let row = await db
    .prepare('SELECT payload FROM snapshots WHERE campaign_id=?')
    .bind(CAMPAIGN.id)
    .first<{ payload: string }>();
  if (!row) {
    await snapshotStatement(db).run();
    row = await db
      .prepare('SELECT payload FROM snapshots WHERE campaign_id=?')
      .bind(CAMPAIGN.id)
      .first<{ payload: string }>();
  }
  if (!row) throw new Error('Reveal snapshot is not ready.');
  return (JSON.parse(row.payload) as CityResult[]).map((r) => ({
    ...r,
    forecast: forecastLabel(r.chemistry.value, r.fog.value, r.friction.value),
  }));
}
