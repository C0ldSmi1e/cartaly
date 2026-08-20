CREATE TABLE `order_items` (
	`menu_id` text NOT NULL,
	`name_hash` text NOT NULL,
	`qty` integer NOT NULL,
	PRIMARY KEY(`menu_id`, `name_hash`),
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`name_hash`) REFERENCES `dishes`(`name_hash`) ON UPDATE no action ON DELETE no action
);
