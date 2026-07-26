CREATE TABLE `action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int,
	`bookingId` int,
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`type` enum('missing_booking','action_required','pending_confirmation','payment_due') NOT NULL,
	`title` varchar(512) NOT NULL,
	`detail` text,
	`dismissed` boolean NOT NULL DEFAULT false,
	`userNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`type` enum('flight','train','hotel','car_rental','restaurant','other') NOT NULL,
	`provider` varchar(256),
	`reference` varchar(128),
	`routeOrProperty` text,
	`dateTime` varchar(64),
	`dateTimeEnd` varchar(64),
	`status` enum('confirmed','pending','missing') NOT NULL DEFAULT 'confirmed',
	`notes` text,
	`gmailThreadId` varchar(128),
	`bookedOn` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gmailMessageId` varchar(128) NOT NULL,
	`gmailThreadId` varchar(128),
	`subject` text,
	`fromAddress` text,
	`dateReceived` varchar(32),
	`snippet` text,
	`isTravel` boolean NOT NULL DEFAULT false,
	`isImportant` boolean NOT NULL DEFAULT false,
	`isStarred` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_cache_gmailMessageId_unique` UNIQUE(`gmailMessageId`)
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`emailsProcessed` int DEFAULT 0,
	`newBookingsFound` int DEFAULT 0,
	`status` varchar(64) DEFAULT 'success',
	`errorMessage` text,
	CONSTRAINT `sync_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destination` varchar(256) NOT NULL,
	`country` varchar(128),
	`dateStart` varchar(32),
	`dateEnd` varchar(32),
	`status` enum('upcoming','past','ongoing') NOT NULL DEFAULT 'upcoming',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trips_id` PRIMARY KEY(`id`)
);
