CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limits_expiry` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `app_secrets` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`campaign_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`city_id` text NOT NULL,
	`session_hash` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`deletion_hash` text NOT NULL,
	`spark` integer,
	`follow_through` integer,
	`affordability` integer,
	`clarity` integer,
	`authenticity` integer,
	`ghosting` integer,
	`logistics` integer,
	`hope` integer,
	`habitat` text NOT NULL,
	`created_at` integer NOT NULL,
	`consent_version` text NOT NULL,
	CONSTRAINT "ck_answer_0" CHECK("submissions"."spark" IS NULL OR (typeof("submissions"."spark") = 'integer' AND "submissions"."spark" BETWEEN 1 AND 5)),
	CONSTRAINT "ck_answer_1" CHECK("submissions"."follow_through" IS NULL OR (typeof("submissions"."follow_through") = 'integer' AND "submissions"."follow_through" BETWEEN 1 AND 5)),
	CONSTRAINT "ck_answer_2" CHECK("submissions"."affordability" IS NULL OR (typeof("submissions"."affordability") = 'integer' AND "submissions"."affordability" BETWEEN 1 AND 5)),
	CONSTRAINT "ck_answer_3" CHECK("submissions"."clarity" IS NULL OR (typeof("submissions"."clarity") = 'integer' AND "submissions"."clarity" BETWEEN 1 AND 5)),
	CONSTRAINT "ck_answer_4" CHECK("submissions"."authenticity" IS NULL OR (typeof("submissions"."authenticity") = 'integer' AND "submissions"."authenticity" BETWEEN 1 AND 5)),
	CONSTRAINT "ck_answer_5" CHECK("submissions"."ghosting" IS NULL OR (typeof("submissions"."ghosting") = 'integer' AND "submissions"."ghosting" BETWEEN 1 AND 5)),
	CONSTRAINT "ck_answer_6" CHECK("submissions"."logistics" IS NULL OR (typeof("submissions"."logistics") = 'integer' AND "submissions"."logistics" BETWEEN 1 AND 5)),
	CONSTRAINT "ck_answer_7" CHECK("submissions"."hope" IS NULL OR (typeof("submissions"."hope") = 'integer' AND "submissions"."hope" BETWEEN 1 AND 5)),
	CONSTRAINT "ck_habitat" CHECK("submissions"."habitat" IN ('apps','friends','irl','hobbies','none'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_submissions_campaign_session` ON `submissions` (`campaign_id`,`session_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_submissions_campaign_idempotency` ON `submissions` (`campaign_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_submissions_campaign_city` ON `submissions` (`campaign_id`,`city_id`);--> statement-breakpoint
CREATE INDEX `idx_submissions_created_at` ON `submissions` (`created_at`);