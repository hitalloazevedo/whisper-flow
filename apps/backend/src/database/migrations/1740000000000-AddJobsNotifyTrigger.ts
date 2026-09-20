import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddJobsNotifyTrigger1740000000000 implements MigrationInterface {
  name = 'AddJobsNotifyTrigger1740000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION notify_new_job() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify('new_job', NEW.id::text);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
    await queryRunner.query(`
      CREATE TRIGGER jobs_notify_insert
      AFTER INSERT ON jobs
      FOR EACH ROW EXECUTE FUNCTION notify_new_job()
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER jobs_notify_insert ON jobs`)
    await queryRunner.query(`DROP FUNCTION notify_new_job()`)
  }
}
