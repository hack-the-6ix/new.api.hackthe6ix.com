ALTER TABLE "formQuestion" DROP CONSTRAINT "formQuestion_formId_form_formId_fk";
--> statement-breakpoint
ALTER TABLE "formResponse" DROP CONSTRAINT "formResponse_formId_form_formId_fk";
--> statement-breakpoint
ALTER TABLE "formResponse" DROP CONSTRAINT "formResponse_seasonCode_season_seasonCode_fk";
--> statement-breakpoint
ALTER TABLE "formQuestion" ADD CONSTRAINT "formQuestion_formId_form_formId_fk" FOREIGN KEY ("formId") REFERENCES "public"."form"("formId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "formResponse" ADD CONSTRAINT "formResponse_formId_form_formId_fk" FOREIGN KEY ("formId") REFERENCES "public"."form"("formId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "formResponse" ADD CONSTRAINT "formResponse_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;