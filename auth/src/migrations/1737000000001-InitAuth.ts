import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAuth1737000000001 implements MigrationInterface {
  name = 'InitAuth1737000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "token" (
        "id" SERIAL PRIMARY KEY,
        "token" character varying(512) UNIQUE,
        "userId" integer NOT NULL UNIQUE,
        "passwordHash" character varying(255),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "token"`);
  }
}
