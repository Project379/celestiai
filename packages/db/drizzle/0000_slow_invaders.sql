CREATE TABLE "charts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text DEFAULT (select auth.jwt()->>'sub') NOT NULL,
	"name" text NOT NULL,
	"birth_date" timestamp with time zone NOT NULL,
	"birth_time_known" boolean DEFAULT true NOT NULL,
	"birth_time" text,
	"approximate_time_range" text,
	"city_id" uuid,
	"city_name" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bulgarian_cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_ascii" text NOT NULL,
	"oblast" text NOT NULL,
	"ekatte" text,
	"type" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"population" real
);
--> statement-breakpoint
ALTER TABLE "charts" ADD CONSTRAINT "charts_city_id_bulgarian_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."bulgarian_cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cities_name_ascii_idx" ON "bulgarian_cities" USING btree ("name_ascii");--> statement-breakpoint
CREATE INDEX "cities_type_idx" ON "bulgarian_cities" USING btree ("type");--> statement-breakpoint
CREATE POLICY "charts_select_own" ON "charts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.jwt()->>'sub') = "charts"."user_id");--> statement-breakpoint
CREATE POLICY "charts_insert_own" ON "charts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.jwt()->>'sub') = "charts"."user_id");--> statement-breakpoint
CREATE POLICY "charts_update_own" ON "charts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.jwt()->>'sub') = "charts"."user_id") WITH CHECK ((select auth.jwt()->>'sub') = "charts"."user_id");--> statement-breakpoint
CREATE POLICY "charts_delete_own" ON "charts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.jwt()->>'sub') = "charts"."user_id");