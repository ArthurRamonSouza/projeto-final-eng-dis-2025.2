-- CreateTable
CREATE TABLE "ads" (
    "id" VARCHAR(255) NOT NULL,
    "title" TEXT NOT NULL,
    "advertiser_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_contents" (
    "id" VARCHAR(36) NOT NULL,
    "ad_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "static_challenges" (
    "id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options_json" JSONB NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'static',
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "static_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "job_id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "requested_count" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "generation_results" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "requested_count" INTEGER NOT NULL,
    "generated_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_consumption_logs" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "consumed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_consumption_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_contents_ad_id_idx" ON "ad_contents"("ad_id");

-- CreateIndex
CREATE INDEX "static_challenges_ad_id_idx" ON "static_challenges"("ad_id");

-- CreateIndex
CREATE INDEX "generation_jobs_ad_id_idx" ON "generation_jobs"("ad_id");

-- CreateIndex
CREATE INDEX "generation_results_job_id_idx" ON "generation_results"("job_id");

-- CreateIndex
CREATE INDEX "generation_results_ad_id_idx" ON "generation_results"("ad_id");

-- CreateIndex
CREATE INDEX "challenge_consumption_logs_challenge_id_idx" ON "challenge_consumption_logs"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_consumption_logs_ad_id_idx" ON "challenge_consumption_logs"("ad_id");

-- AddForeignKey
ALTER TABLE "ad_contents" ADD CONSTRAINT "ad_contents_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "static_challenges" ADD CONSTRAINT "static_challenges_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_results" ADD CONSTRAINT "generation_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "generation_jobs"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_results" ADD CONSTRAINT "generation_results_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_consumption_logs" ADD CONSTRAINT "challenge_consumption_logs_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "static_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_consumption_logs" ADD CONSTRAINT "challenge_consumption_logs_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
