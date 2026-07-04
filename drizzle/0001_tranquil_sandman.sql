CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`content` text,
	`category` enum('gold','stock','currency','economy','tech','other') NOT NULL,
	`tags` varchar(500),
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramId` varchar(64),
	`name` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`topic` enum('gold','stock','currency','portfolio','other') NOT NULL,
	`message` text,
	`preferredDate` varchar(20),
	`preferredTime` varchar(20),
	`status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consultations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramId` varchar(64) NOT NULL,
	`assetType` enum('gold','stock','currency','crypto','other') NOT NULL,
	`name` varchar(255) NOT NULL,
	`quantity` decimal(18,6) NOT NULL,
	`buyPrice` decimal(18,2) NOT NULL,
	`currentPrice` decimal(18,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramId` varchar(64) NOT NULL,
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255),
	`username` varchar(255),
	`name` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_users_telegramId_unique` UNIQUE(`telegramId`)
);
