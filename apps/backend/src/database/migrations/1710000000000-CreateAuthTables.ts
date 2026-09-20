import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAuthTables1710000000000 implements MigrationInterface {
  name = 'CreateAuthTables1710000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`)
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_sessions" ("sid" character varying NOT NULL, "sess" json NOT NULL, "expire" TIMESTAMP(6) NOT NULL, CONSTRAINT "session_pkey" PRIMARY KEY ("sid"))`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire")`,
    )
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "displayName" character varying NOT NULL, "avatarUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_users_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "oauth_accounts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "provider" character varying NOT NULL, "providerSubject" character varying NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_oauth_provider_subject" UNIQUE ("provider", "providerSubject"), CONSTRAINT "PK_oauth_accounts_id" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "oauth_accounts" ADD CONSTRAINT "FK_oauth_accounts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "oauth_accounts" DROP CONSTRAINT "FK_oauth_accounts_user"`)
    await queryRunner.query(`DROP TABLE "oauth_accounts"`)
    await queryRunner.query(`DROP TABLE "users"`)
  }
}
