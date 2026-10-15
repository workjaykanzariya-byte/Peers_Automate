-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "csv_filename" VARCHAR(255),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_bulk_csv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rate_limit_per_sec" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "company_name" VARCHAR(150),
ADD COLUMN     "follow_up_date" TIMESTAMPTZ,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "opted_out_at" TIMESTAMPTZ,
ADD COLUMN     "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "webhook_delivery_logs" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "event_id" VARCHAR(100);

-- AlterTable
ALTER TABLE "webhook_endpoints" ADD COLUMN     "name" VARCHAR(150) NOT NULL DEFAULT 'Webhook Endpoint',
ADD COLUMN     "payload_mapping" JSONB;
