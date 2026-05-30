CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE "public"."alert_variant" AS ENUM('default', 'destructive', 'warning', 'success');--> statement-breakpoint
CREATE TYPE "public"."embed_platform" AS ENUM('instagram', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."event_category" AS ENUM('Centre ville', 'St. Michel', 'St. Genès', 'Chartrons', 'Bassins à flot', 'Rive droite', 'Ambulant', 'Bordeaux ouest', 'Bordeaux sud', 'Bordeaux nord', 'Talence', 'Pessac', 'Mérignac', 'Blanquefort', 'Saint-Médard-en-Jalles');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('canceled', 'postponed', 'rescheduled');--> statement-breakpoint
CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"description" text,
	"day_of_festival" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editions_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"legacy_id" text,
	"name" text,
	"description" text,
	"category" "event_category",
	"status" "event_status",
	"genres" text[],
	"artists" text[],
	"price_text" text,
	"location_name" text NOT NULL,
	"location_address" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_time_check" CHECK (end_time IS NULL OR end_time >= start_time)
);
--> statement-breakpoint
CREATE TABLE "event_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "event_links_position_check" CHECK (position >= 0)
);
--> statement-breakpoint
CREATE TABLE "event_embed_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"platform" "embed_platform" NOT NULL,
	"url" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "event_embed_links_position_check" CHECK (position >= 0)
);
--> statement-breakpoint
CREATE TABLE "event_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"variant" "alert_variant" NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "event_alerts_position_check" CHECK (position >= 0)
);
--> statement-breakpoint
CREATE TABLE "general_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"variant" "alert_variant" NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "general_alerts_position_check" CHECK (position >= 0)
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_links" ADD CONSTRAINT "event_links_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_embed_links" ADD CONSTRAINT "event_embed_links_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_alerts" ADD CONSTRAINT "event_alerts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_alerts" ADD CONSTRAINT "general_alerts_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_edition_legacy_id_uq" ON "events" USING btree ("edition_id","legacy_id") WHERE legacy_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "events_edition_start_time_idx" ON "events" USING btree ("edition_id","start_time","id");--> statement-breakpoint
CREATE INDEX "events_edition_category_idx" ON "events" USING btree ("edition_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "event_links_event_position_uq" ON "event_links" USING btree ("event_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "event_links_event_url_uq" ON "event_links" USING btree ("event_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "event_embed_links_event_position_uq" ON "event_embed_links" USING btree ("event_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "event_embed_links_event_url_uq" ON "event_embed_links" USING btree ("event_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "event_alerts_event_position_uq" ON "event_alerts" USING btree ("event_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "general_alerts_edition_position_uq" ON "general_alerts" USING btree ("edition_id","position");