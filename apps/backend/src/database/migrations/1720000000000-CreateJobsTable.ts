import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateJobsTable1720000000000 implements MigrationInterface {
  name = 'CreateJobsTable1720000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "jobs_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed')`,
    )
    await queryRunner.query(
      `CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdBy" uuid NOT NULL, "status" "jobs_status_enum" NOT NULL DEFAULT 'pending', "inputPath" character varying NOT NULL, "outputPath" character varying, "errorMessage" character varying, "retryCount" integer NOT NULL DEFAULT 0, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "startedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_jobs_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD CONSTRAINT "FK_jobs_created_by" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_status_created_at" ON "jobs" ("status", "createdAt")`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_jobs_status_created_at"`)
    await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_jobs_created_by"`)
    await queryRunner.query(`DROP TABLE "jobs"`)
    await queryRunner.query(`DROP TYPE "jobs_status_enum"`)
  }
}
