import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUsers1737000000000 implements MigrationInterface {
  name = 'InitUsers1737000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "contributionIds" integer[]
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'users'
            AND indexdef ILIKE '%("email")%'
            AND indexdef ILIKE '%unique%'
        ) THEN
          CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "contributionIds" integer[]
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'users'
            AND column_name = 'contributionId'
        ) THEN
          UPDATE "users"
          SET "contributionIds" = ARRAY["contributionId"]
          WHERE "contributionId" IS NOT NULL;

          ALTER TABLE "users" DROP COLUMN "contributionId";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
