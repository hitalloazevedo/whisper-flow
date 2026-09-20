import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNextAttemptAtToJobs1780000000000 implements MigrationInterface {
  name = 'AddNextAttemptAtToJobs1780000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN "nextAttemptAt" TIMESTAMPTZ`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "nextAttemptAt"`)
  }
}
