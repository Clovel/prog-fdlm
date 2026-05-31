DROP INDEX "favorite_user_event_uq";--> statement-breakpoint
ALTER TABLE "favorite" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite" ADD COLUMN "anon_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_anon_event_uq" ON "favorite" USING btree ("anon_id","event_id") WHERE anon_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "favorite_event_id_idx" ON "favorite" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_user_event_uq" ON "favorite" USING btree ("user_id","event_id") WHERE user_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_owner_chk" CHECK (num_nonnulls(user_id, anon_id) = 1);