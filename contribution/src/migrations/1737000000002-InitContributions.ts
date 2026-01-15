import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitContributions1737000000002
  implements MigrationInterface
{
  name = 'InitContributions1737000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contributions" (
        "id" SERIAL PRIMARY KEY,
        "title" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "publishedAt" timestamptz NOT NULL,
        "authorId" integer NOT NULL,
        "authorName" character varying(200) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = 'contributions'
            AND indexdef ILIKE '%("authorId")%'
        ) THEN
          CREATE INDEX "IDX_contributions_authorId"
            ON "contributions" ("authorId");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contributions_authorId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "contributions"`);
  }
}
