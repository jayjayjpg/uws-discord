-- CreateTable
CREATE TABLE "engagement_state" (
    "guild_id" TEXT NOT NULL,
    "prompt_type" TEXT NOT NULL,
    "last_posted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_state_pkey" PRIMARY KEY ("guild_id","prompt_type")
);
