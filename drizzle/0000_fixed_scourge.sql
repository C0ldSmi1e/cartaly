CREATE TABLE `dishes` (
	`name_hash` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`image_key` text,
	`calories` integer,
	`description` text,
	`hits` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menu_photos` (
	`menu_id` text NOT NULL,
	`photo_hash` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`menu_id`, `photo_hash`),
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`photo_hash`) REFERENCES `photos`(`photo_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`photo_hash` text PRIMARY KEY NOT NULL,
	`dishes_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` integer NOT NULL
);
