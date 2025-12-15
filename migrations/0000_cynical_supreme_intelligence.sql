CREATE TYPE "public"."hackerStatus" AS ENUM('no apply', 'applied', 'accepted', 'rejected', 'rsvped', 'checked-in');--> statement-breakpoint
CREATE TABLE "admin" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"superUser" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "event" (
	"seasonCode" char(3) NOT NULL,
	"eventId" uuid DEFAULT uuidv7() NOT NULL,
	"eventName" text NOT NULL,
	"startTime" timestamp,
	"endTime" timestamp,
	CONSTRAINT "event_seasonCode_eventId_pk" PRIMARY KEY("seasonCode","eventId")
);
--> statement-breakpoint
CREATE TABLE "eventCheckIn" (
	"seasonCode" char(3) NOT NULL,
	"eventId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"checkInAuthor" uuid NOT NULL,
	"checkInNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "eventCheckIn_seasonCode_eventId_userId_pk" PRIMARY KEY("seasonCode","eventId","userId")
);
--> statement-breakpoint
CREATE TABLE "form" (
	"formId" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"seasonCode" char(3),
	"formName" text,
	"openTime" timestamp,
	"closeTime" timestamp,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formQuestion" (
	"formQuestionId" varchar(80),
	"formId" uuid,
	"seasonCode" char(3),
	"questionType" text,
	"tags" text[] DEFAULT ARRAY[]::text[],
	CONSTRAINT "formQuestion_formQuestionId_seasonCode_pk" PRIMARY KEY("formQuestionId","seasonCode")
);
--> statement-breakpoint
CREATE TABLE "formResponse" (
	"formResponseId" uuid DEFAULT uuidv7(),
	"formId" uuid,
	"userId" uuid NOT NULL,
	"seasonCode" char(3),
	"responseJson" jsonb NOT NULL,
	"isSubmitted" boolean DEFAULT false,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "formResponse_formResponseId_seasonCode_pk" PRIMARY KEY("formResponseId","seasonCode"),
	CONSTRAINT "formResponse_seasonCode_userId_formId_unique" UNIQUE("seasonCode","userId","formId")
);
--> statement-breakpoint
CREATE TABLE "hacker" (
	"hackerId" uuid DEFAULT uuidv7(),
	"userId" uuid NOT NULL,
	"seasonCode" char(3) NOT NULL,
	"score" real NOT NULL,
	"status" "hackerStatus",
	"nfcId" text,
	CONSTRAINT "hacker_hackerId_seasonCode_pk" PRIMARY KEY("hackerId","seasonCode"),
	CONSTRAINT "hacker_nfcId_unique" UNIQUE("nfcId"),
	CONSTRAINT "hacker_userId_seasonCode_unique" UNIQUE("userId","seasonCode")
);
--> statement-breakpoint
CREATE TABLE "hackerApplicationReview" (
	"hackerApplicationReviewId" uuid DEFAULT uuidv7(),
	"seasonCode" char(3),
	"winnerId" uuid,
	"loserId" uuid,
	"winnerNewScore" real,
	"loserNewScore" real,
	"winnerOldScore" real,
	"loserOldScore" real,
	"reviewNotes" text,
	"reviewerId" uuid,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "hackerApplicationReview_hackerApplicationReviewId_seasonCode_pk" PRIMARY KEY("hackerApplicationReviewId","seasonCode")
);
--> statement-breakpoint
CREATE TABLE "mentor" (
	"mentorId" uuid DEFAULT uuidv7(),
	"userId" uuid NOT NULL,
	"seasonCode" char(3) NOT NULL,
	CONSTRAINT "mentor_mentorId_seasonCode_pk" PRIMARY KEY("mentorId","seasonCode"),
	CONSTRAINT "mentor_userId_seasonCode_unique" UNIQUE("userId","seasonCode")
);
--> statement-breakpoint
CREATE TABLE "season" (
	"seasonId" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"seasonCode" char(3) NOT NULL,
	"hackerApplicationFormId" uuid,
	"rsvpFormId" uuid,
	CONSTRAINT "season_seasonCode_unique" UNIQUE("seasonCode"),
	CONSTRAINT "season_hackerApplicationFormId_unique" UNIQUE("hackerApplicationFormId"),
	CONSTRAINT "season_rsvpFormId_unique" UNIQUE("rsvpFormId")
);
--> statement-breakpoint
CREATE TABLE "sponsor" (
	"sponsorId" uuid DEFAULT uuidv7(),
	"userId" uuid NOT NULL,
	"seasonCode" char(3) NOT NULL,
	"org" text,
	CONSTRAINT "sponsor_sponsorId_seasonCode_pk" PRIMARY KEY("sponsorId","seasonCode"),
	CONSTRAINT "sponsor_userId_seasonCode_unique" UNIQUE("userId","seasonCode")
);
--> statement-breakpoint
CREATE TABLE "volunteer" (
	"volunteerId" uuid DEFAULT uuidv7(),
	"userId" uuid NOT NULL,
	"seasonCode" char(3) NOT NULL,
	CONSTRAINT "volunteer_volunteerId_seasonCode_pk" PRIMARY KEY("volunteerId","seasonCode"),
	CONSTRAINT "volunteer_userId_seasonCode_unique" UNIQUE("userId","seasonCode")
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "eventCheckIn" ADD CONSTRAINT "eventCheckIn_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "eventCheckIn" ADD CONSTRAINT "eventCheckIn_seasonCode_eventId_event_seasonCode_eventId_fk" FOREIGN KEY ("seasonCode","eventId") REFERENCES "public"."event"("seasonCode","eventId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form" ADD CONSTRAINT "form_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "formQuestion" ADD CONSTRAINT "formQuestion_formId_form_formId_fk" FOREIGN KEY ("formId") REFERENCES "public"."form"("formId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "formQuestion" ADD CONSTRAINT "formQuestion_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "formResponse" ADD CONSTRAINT "formResponse_formId_form_formId_fk" FOREIGN KEY ("formId") REFERENCES "public"."form"("formId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "formResponse" ADD CONSTRAINT "formResponse_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hacker" ADD CONSTRAINT "hacker_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hackerApplicationReview" ADD CONSTRAINT "hackerApplicationReview_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hackerApplicationReview" ADD CONSTRAINT "hackerApplicationReview_reviewerId_admin_userId_fk" FOREIGN KEY ("reviewerId") REFERENCES "public"."admin"("userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor" ADD CONSTRAINT "mentor_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sponsor" ADD CONSTRAINT "sponsor_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "volunteer" ADD CONSTRAINT "volunteer_seasonCode_season_seasonCode_fk" FOREIGN KEY ("seasonCode") REFERENCES "public"."season"("seasonCode") ON DELETE no action ON UPDATE cascade;