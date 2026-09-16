CREATE TABLE `attempt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`card_id` integer NOT NULL,
	`typed` text DEFAULT '' NOT NULL,
	`is_correct` integer NOT NULL,
	`revealed` integer DEFAULT false NOT NULL,
	`ms` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `card`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_attempt_card` ON `attempt` (`card_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_attempt_session` ON `attempt` (`session_id`);--> statement-breakpoint
CREATE TABLE `card` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`prompt` text NOT NULL,
	`meaning` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `card_group`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_card_group` ON `card` (`group_id`);--> statement-breakpoint
CREATE TABLE `card_answer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`romaji` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `card`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_card_answer_card` ON `card_answer` (`card_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_card_answer_primary` ON `card_answer` (`card_id`) WHERE is_primary = 1;--> statement-breakpoint
CREATE TABLE `card_group` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_id` integer NOT NULL,
	`name` text NOT NULL,
	`section` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_card_group_deck` ON `card_group` (`deck_id`);--> statement-breakpoint
CREATE TABLE `deck` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_builtin` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dict_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kana` text NOT NULL,
	`kanji` text,
	`romaji` text NOT NULL,
	`pos` text,
	`is_common` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dict_gloss` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`lang` text NOT NULL,
	`text` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `dict_entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_dict_gloss_entry` ON `dict_gloss` (`entry_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`mode` text DEFAULT 'normal' NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`incorrect` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_group` (
	`session_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	PRIMARY KEY(`session_id`, `group_id`),
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `card_group`(`id`) ON UPDATE no action ON DELETE cascade
);
