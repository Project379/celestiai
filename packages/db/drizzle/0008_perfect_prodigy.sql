CREATE TABLE "crystal_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crystal_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"sku" text,
	"price_bgn" real,
	"price_original" real,
	"currency" text DEFAULT 'BGN' NOT NULL,
	"affiliate_url" text,
	"product_url" text,
	"image_url" text,
	"in_stock" boolean,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crystal_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"chart_id" uuid,
	"crystal_id" uuid NOT NULL,
	"trigger_type" text NOT NULL,
	"reason_code" text NOT NULL,
	"reason_text_en" text NOT NULL,
	"reason_text_bg" text,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"collected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crystal_vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT 'BG' NOT NULL,
	"integration_type" text DEFAULT 'affiliate' NOT NULL,
	"website" text,
	"api_config" jsonb,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crystal_vendors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "crystals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_bg" text,
	"tagline_en" text NOT NULL,
	"tagline_bg" text,
	"description_en" text NOT NULL,
	"description_bg" text,
	"planet" text,
	"zodiac_signs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"moon_phases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"element" text,
	"chakra" text,
	"hardness" real,
	"color_primary" text NOT NULL,
	"color_secondary" text NOT NULL,
	"color_accent" text,
	"svg_variant" text DEFAULT 'tumbled' NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crystals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_crystals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"crystal_id" uuid NOT NULL,
	"source" text NOT NULL,
	"reason_text" text,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crystal_listings" ADD CONSTRAINT "crystal_listings_crystal_id_crystals_id_fk" FOREIGN KEY ("crystal_id") REFERENCES "public"."crystals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crystal_listings" ADD CONSTRAINT "crystal_listings_vendor_id_crystal_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."crystal_vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crystal_recommendations" ADD CONSTRAINT "crystal_recommendations_chart_id_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."charts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crystal_recommendations" ADD CONSTRAINT "crystal_recommendations_crystal_id_crystals_id_fk" FOREIGN KEY ("crystal_id") REFERENCES "public"."crystals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_crystals" ADD CONSTRAINT "user_crystals_crystal_id_crystals_id_fk" FOREIGN KEY ("crystal_id") REFERENCES "public"."crystals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crystal_recs_user_reason_valid_idx" ON "crystal_recommendations" USING btree ("user_id","reason_code","valid_from");--> statement-breakpoint
CREATE UNIQUE INDEX "user_crystals_user_crystal_idx" ON "user_crystals" USING btree ("user_id","crystal_id");