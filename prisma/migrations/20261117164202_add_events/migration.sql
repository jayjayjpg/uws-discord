-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "host_id" TEXT NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "voice_channel_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "discord_event_id" TEXT,
    "reminder_sent_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvps" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'going',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_feedback" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_guild_id_status_idx" ON "events"("guild_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_rsvps_event_id_user_id_key" ON "event_rsvps"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_feedback_event_id_user_id_key" ON "event_feedback"("event_id", "user_id");

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feedback" ADD CONSTRAINT "event_feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
