ALTER TABLE "events" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "geocoded_address" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "geocode_status" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "geocode_score" double precision;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "geocoded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "formatted_address" text;