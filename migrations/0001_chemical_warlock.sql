CREATE TABLE "point_conversion_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_type" text NOT NULL,
	"base_rate" numeric(10, 2) NOT NULL,
	"min_points" integer DEFAULT 100,
	"max_points" integer DEFAULT 10000,
	"carrier_overrides" jsonb,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "point_redemptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" varchar NOT NULL,
	"phone_number" text NOT NULL,
	"carrier" text NOT NULL,
	"product_type" text NOT NULL,
	"naira_value" numeric(10, 2) NOT NULL,
	"points_debited" integer NOT NULL,
	"flutterwave_reference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "political_facts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" integer,
	"content" text NOT NULL,
	"source" text NOT NULL,
	"year" integer,
	"category" text NOT NULL,
	"subcategory" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "political_quotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" integer,
	"content" text NOT NULL,
	"speaker" text NOT NULL,
	"position" text,
	"context" text,
	"year" integer,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "point_redemptions" ADD CONSTRAINT "point_redemptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;