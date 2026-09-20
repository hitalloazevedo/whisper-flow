import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOriginalFilenameToJobs1730000000000 implements MigrationInterface {
  name = 'AddOriginalFilenameToJobs1730000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD COLUMN "originalFilename" character varying NOT NULL DEFAULT ''`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "originalFilename"`)
  }
}
