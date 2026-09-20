import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWorkerHeartbeats1790000000000 implements MigrationInterface {
  name = 'CreateWorkerHeartbeats1790000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "worker_heartbeats" (
        "hostname" VARCHAR NOT NULL,
        "pid" INTEGER NOT NULL,
        "status" VARCHAR NOT NULL,
        "currentJobId" UUID,
        "lastSeenAt" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "PK_worker_heartbeats" PRIMARY KEY ("hostname", "pid")
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "worker_heartbeats"`)
  }
}
