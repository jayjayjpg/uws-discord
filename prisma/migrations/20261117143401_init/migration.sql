-- CreateTable
CREATE TABLE "warnings" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_stats" (
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "message_stats_pkey" PRIMARY KEY ("guild_id","user_id")
);

-- CreateIndex
CREATE INDEX "warnings_guild_id_user_id_idx" ON "warnings"("guild_id", "user_id");
