-- Strength training optimization: Replace duration_minutes with sets/reps/weight
-- Since there's no existing data, we drop and recreate the table

DROP TABLE IF EXISTS `exercise_records`;
--> statement-breakpoint
CREATE TABLE `exercise_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_type` text NOT NULL,
	`sets` integer NOT NULL,
	`reps` integer NOT NULL,
	`weight` real,
	`recorded_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_exercise_user_date` ON `exercise_records` (`user_id`,`recorded_at`);
--> statement-breakpoint
CREATE INDEX `idx_exercise_user_type_date` ON `exercise_records` (`user_id`,`exercise_type`,`recorded_at`);
