import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddJobsNotifyUpdateTrigger1760000000000 implements MigrationInterface {
  name = 'AddJobsNotifyUpdateTrigger1760000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION notify_new_job() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify(
          'new_job',
          json_build_object('event', 'insert', 'id', NEW.id, 'status', NEW.status, 'createdBy', NEW."createdBy")::text
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
    await queryRunner.query(`
      CREATE FUNCTION notify_job_update() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify(
          'new_job',
          json_build_object('event', 'update', 'id', NEW.id, 'status', NEW.status, 'createdBy', NEW."createdBy")::text
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
    await queryRunner.query(`
      CREATE TRIGGER jobs_notify_update
      AFTER UPDATE ON jobs
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION notify_job_update()
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER jobs_notify_update ON jobs`)
    await queryRunner.query(`DROP FUNCTION notify_job_update()`)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION notify_new_job() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify('new_job', NEW.id::text);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
  }
}
