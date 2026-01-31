ALTER TABLE "gyms" ALTER COLUMN "location" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "operating_hours" text;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "amenities" text;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "certifications" text;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "experience_years" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "linkedin_url" text;