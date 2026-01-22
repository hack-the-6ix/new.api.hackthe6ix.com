ALTER TABLE "formQuestion" RENAME COLUMN "formQuestionId" TO "formQuestionRef";--> statement-breakpoint
ALTER TABLE "formQuestion" DROP CONSTRAINT "formQuestion_formQuestionId_formId_seasonCode_pk";--> statement-breakpoint
ALTER TABLE "formQuestion" ADD CONSTRAINT "formQuestion_formQuestionRef_formId_seasonCode_pk" PRIMARY KEY("formQuestionRef","formId","seasonCode");