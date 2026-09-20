import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDeletedAtToJobs1770000000000 implements MigrationInterface {
  name = 'AddDeletedAtToJobs1770000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN "deletedAt" TIMESTAMPTZ`)
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_deletedAt" ON "jobs" ("deletedAt") WHERE "deletedAt" IS NOT NULL`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_jobs_deletedAt"`)
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "deletedAt"`)
  }
}
