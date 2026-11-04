CREATE TABLE `accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_username` ON `accounts` (`username`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `sessions` (`expires`);