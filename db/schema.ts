import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id').notNull(),
    cityId: text('city_id').notNull(),
    sessionHash: text('session_hash').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    payloadHash: text('payload_hash').notNull(),
    deletionHash: text('deletion_hash').notNull(),
    spark: integer('spark'),
    followThrough: integer('follow_through'),
    affordability: integer('affordability'),
    clarity: integer('clarity'),
    authenticity: integer('authenticity'),
    ghosting: integer('ghosting'),
    logistics: integer('logistics'),
    hope: integer('hope'),
    habitat: text('habitat').notNull(),
    createdAt: integer('created_at').notNull(),
    consentVersion: text('consent_version').notNull(),
  },
  (table) => [
    uniqueIndex('uq_submissions_campaign_session').on(
      table.campaignId,
      table.sessionHash,
    ),
    uniqueIndex('uq_submissions_campaign_idempotency').on(
      table.campaignId,
      table.idempotencyKey,
    ),
    index('idx_submissions_campaign_city').on(table.campaignId, table.cityId),
    index('idx_submissions_created_at').on(table.createdAt),
    ...[
      table.spark,
      table.followThrough,
      table.affordability,
      table.clarity,
      table.authenticity,
      table.ghosting,
      table.logistics,
      table.hope,
    ].map((column, i) =>
      check(
        `ck_answer_${i}`,
        sql`${column} IS NULL OR (typeof(${column}) = 'integer' AND ${column} BETWEEN 1 AND 5)`,
      ),
    ),
    check(
      'ck_habitat',
      sql`${table.habitat} IN ('apps','friends','irl','hobbies','none')`,
    ),
  ],
);
export const snapshots = sqliteTable('snapshots', {
  campaignId: text('campaign_id').primaryKey(),
  payload: text('payload').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('idx_rate_limits_expiry').on(t.expiresAt)],
);
export const secrets = sqliteTable('app_secrets', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
