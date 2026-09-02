CREATE TABLE `details` (
	`name_hash` text PRIMARY KEY NOT NULL,
	`detail_json` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`name_hash`) REFERENCES `dishes`(`name_hash`) ON UPDATE no action ON DELETE no action
);
