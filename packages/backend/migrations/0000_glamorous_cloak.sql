CREATE TABLE `exercise_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_type` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meal_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`applied_changes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meal_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meal_food_items` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`name` text NOT NULL,
	`portion` text NOT NULL,
	`calories` integer NOT NULL,
	`protein` real NOT NULL,
	`fat` real NOT NULL,
	`carbs` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meal_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meal_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`meal_type` text NOT NULL,
	`content` text NOT NULL,
	`calories` integer,
	`photo_key` text,
	`total_protein` real,
	`total_fat` real,
	`total_carbs` real,
	`analysis_source` text,
	`recorded_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`goal_weight` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weight_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`weight` real NOT NULL,
	`recorded_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_exercise_user_date` ON `exercise_records` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_meal` ON `meal_chat_messages` (`meal_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_food_items_meal` ON `meal_food_items` (`meal_id`);--> statement-breakpoint
CREATE INDEX `idx_meal_user_date` ON `meal_records` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_weight_user_date` ON `weight_records` (`user_id`,`recorded_at`);