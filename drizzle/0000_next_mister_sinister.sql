CREATE TABLE `blocks` (
	`user` text NOT NULL,
	`blocked` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `block_pair` ON `blocks` (`user`,`blocked`);--> statement-breakpoint
CREATE TABLE `encounters` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`story` text NOT NULL,
	`place` text NOT NULL,
	`city` text NOT NULL,
	`category` text NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`happened` text NOT NULL,
	`created` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `encounters_created` ON `encounters` (`created`);--> statement-breakpoint
CREATE INDEX `encounters_owner` ON `encounters` (`owner`);--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread` text NOT NULL,
	`sender` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_thread` ON `messages` (`thread`,`created`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`alias` text NOT NULL,
	`adult` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`encounter` text NOT NULL,
	`reason` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_pair` ON `reports` (`user`,`encounter`);--> statement-breakpoint
CREATE TABLE `saved` (
	`user` text NOT NULL,
	`encounter` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_pair` ON `saved` (`user`,`encounter`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter` text NOT NULL,
	`owner` text NOT NULL,
	`respondent` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `thread_pair` ON `threads` (`encounter`,`respondent`);