ALTER TABLE `users` ADD `super_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `users` SET `super_admin` = 1 WHERE `email` IN ('marthacer7@gmail.com', 'julii1295@gmail.com');
