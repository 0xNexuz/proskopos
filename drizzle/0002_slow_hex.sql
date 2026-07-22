CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`sent_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `watchlists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`stacks` text DEFAULT '[]' NOT NULL,
	`categories` text DEFAULT '[]' NOT NULL,
	`min_reward` integer DEFAULT 0 NOT NULL,
	`verified_only` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `user_lead_state` ADD `outcome` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_lead_state` ADD `outcome_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `passport_headline` text DEFAULT 'Independent Web3 security researcher' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `passport_bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `passport_slug` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `passport_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `github_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `audit_report_urls` text DEFAULT '[]' NOT NULL;