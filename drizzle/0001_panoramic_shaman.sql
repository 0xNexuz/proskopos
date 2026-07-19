CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`source` text PRIMARY KEY NOT NULL,
	`last_synced_at` text NOT NULL,
	`status` text NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `user_lead_state` (
	`user_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`saved` integer DEFAULT false NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`pitched_at` text,
	`notes` text DEFAULT '' NOT NULL,
	`next_action_at` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `lead_id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`goals` text DEFAULT '[]' NOT NULL,
	`stacks` text DEFAULT '[]' NOT NULL,
	`chains` text DEFAULT '[]' NOT NULL,
	`specialties` text DEFAULT '[]' NOT NULL,
	`experience_level` text DEFAULT 'Growing' NOT NULL,
	`portfolio_url` text DEFAULT '' NOT NULL,
	`min_reward` integer DEFAULT 0 NOT NULL,
	`availability` text DEFAULT 'Flexible' NOT NULL,
	`region` text DEFAULT 'Global' NOT NULL,
	`scoped_only` integer DEFAULT true NOT NULL,
	`alert_frequency` text DEFAULT 'Daily' NOT NULL,
	`alert_channel` text DEFAULT 'In-app' NOT NULL,
	`alert_destination` text DEFAULT '' NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `evidence_confidence` text DEFAULT 'inferred' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `evidence_note` text DEFAULT '' NOT NULL;