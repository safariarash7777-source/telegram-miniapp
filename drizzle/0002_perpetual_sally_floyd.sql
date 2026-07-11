ALTER TABLE `telegram_users` ADD `role` enum('user','admin') DEFAULT 'user' NOT NULL;--> statement-breakpoint
CREATE INDEX `consultations_telegramId_idx` ON `consultations` (`telegramId`);--> statement-breakpoint
CREATE INDEX `portfolio_assets_telegramId_idx` ON `portfolio_assets` (`telegramId`);