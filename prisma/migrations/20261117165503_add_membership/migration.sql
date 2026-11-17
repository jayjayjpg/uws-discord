-- CreateTable
CREATE TABLE "memberships" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "provider" TEXT,
    "external_subscription_id" TEXT,
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("provider","event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memberships_guild_id_user_id_key" ON "memberships"("guild_id", "user_id");
