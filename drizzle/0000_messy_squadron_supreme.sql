CREATE TABLE `dishes` (
	`name_hash` text PRIMARY KEY NOT NULL,
	`original_name` text NOT NULL,
	`image_key` text,
	`hits` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`photo_hash` text NOT NULL,
	`lang` text NOT NULL,
	`restaurant_name` text,
	`detected_language` text NOT NULL,
	`detected_currency` text,
	`menu_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menus_photo_hash_lang` ON `menus` (`photo_hash`,`lang`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` integer NOT NULL
);
