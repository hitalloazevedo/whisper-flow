import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTraceIdToJobs1750000000000 implements MigrationInterface {
  name = 'AddTraceIdToJobs1750000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN "traceId" character varying`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "traceId"`)
  }
}
