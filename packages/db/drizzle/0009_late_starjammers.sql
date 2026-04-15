CREATE TABLE "user_daily_crystals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"crystal_id" uuid NOT NULL,
	"date" text NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_daily_crystals" ADD CONSTRAINT "user_daily_crystals_crystal_id_crystals_id_fk" FOREIGN KEY ("crystal_id") REFERENCES "public"."crystals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_daily_crystals_user_date_idx" ON "user_daily_crystals" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "user_daily_crystals_user_idx" ON "user_daily_crystals" USING btree ("user_id");