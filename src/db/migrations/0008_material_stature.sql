CREATE TABLE "edition_embed_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"platform" "embed_platform" NOT NULL,
	"url" text NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edition_embed_links_position_check" CHECK (position >= 0)
);
--> statement-breakpoint
ALTER TABLE "edition_embed_links" ADD CONSTRAINT "edition_embed_links_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "edition_embed_links_edition_position_uq" ON "edition_embed_links" USING btree ("edition_id","position");