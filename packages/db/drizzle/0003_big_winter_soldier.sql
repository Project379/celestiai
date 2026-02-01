CREATE TABLE "chart_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chart_id" uuid NOT NULL,
	"planet_positions" jsonb NOT NULL,
	"house_cusps" jsonb NOT NULL,
	"aspects" jsonb NOT NULL,
	"ascendant" jsonb NOT NULL,
	"mc" jsonb NOT NULL,
	"birth_time_known" boolean NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chart_calculations_chart_id_unique" UNIQUE("chart_id")
);
--> statement-breakpoint
ALTER TABLE "chart_calculations" ADD CONSTRAINT "chart_calculations_chart_id_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."charts"("id") ON DELETE cascade ON UPDATE no action;