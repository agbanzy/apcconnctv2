CREATE TABLE "electoral_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"total_registered_voters" integer,
	"male_voters" integer,
	"female_voters" integer,
	"pwd_voters" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "regional_electoral_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stats_id" varchar,
	"region" text NOT NULL,
	"voters" integer,
	"percentage" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "senatorial_districts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"state_id" varchar NOT NULL,
	"district_name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "senatorial_districts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "states" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "states" ADD COLUMN "capital" text;--> statement-breakpoint
ALTER TABLE "regional_electoral_stats" ADD CONSTRAINT "regional_electoral_stats_stats_id_electoral_stats_id_fk" FOREIGN KEY ("stats_id") REFERENCES "public"."electoral_stats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "senatorial_districts" ADD CONSTRAINT "senatorial_districts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;