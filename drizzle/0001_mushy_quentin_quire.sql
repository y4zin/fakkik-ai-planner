CREATE TABLE `plannerFocusModes` (
	`workspaceId` varchar(64) NOT NULL,
	`strictEndsAt` bigint,
	`continuePlan` boolean NOT NULL DEFAULT false,
	`conversationId` varchar(64),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plannerFocusModes_workspaceId` PRIMARY KEY(`workspaceId`)
);
