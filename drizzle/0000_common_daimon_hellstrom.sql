CREATE TABLE `plannerConversations` (
	`id` varchar(64) NOT NULL,
	`workspaceId` varchar(64) NOT NULL,
	`title` varchar(400) NOT NULL,
	`messagesJson` text NOT NULL,
	`planJson` text,
	`status` enum('draft','planned','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plannerConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plannerFocusSessions` (
	`id` varchar(64) NOT NULL,
	`workspaceId` varchar(64) NOT NULL,
	`conversationId` varchar(64) NOT NULL,
	`stepOrder` int NOT NULL,
	`stepTitle` varchar(400) NOT NULL,
	`durationSeconds` int NOT NULL,
	`startedAt` bigint NOT NULL,
	`endsAt` bigint NOT NULL,
	`status` enum('running','awaiting_reflection','completed','needs_replan','cancelled') NOT NULL DEFAULT 'running',
	`obstacle` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plannerFocusSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plannerMemories` (
	`id` varchar(64) NOT NULL,
	`workspaceId` varchar(64) NOT NULL,
	`conversationId` varchar(64),
	`kind` enum('preference','constraint','obstacle','success_pattern') NOT NULL,
	`content` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plannerMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
