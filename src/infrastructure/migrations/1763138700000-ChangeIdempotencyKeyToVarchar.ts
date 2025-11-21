import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to change idempotency_key from uuid to varchar
 * This allows using custom payment references as idempotency keys
 */
export class ChangeIdempotencyKeyToVarchar1763138700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique index first
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_PAYMENT_TRANSACTIONS_IDEMPOTENCY_KEY"`,
    );

    // Change column type from uuid to varchar
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "idempotency_key" TYPE varchar(100)`,
    );

    // Recreate the unique index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_PAYMENT_TRANSACTIONS_IDEMPOTENCY_KEY" ON "payment_transactions" ("idempotency_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_PAYMENT_TRANSACTIONS_IDEMPOTENCY_KEY"`,
    );

    // Change column type back to uuid
    // Note: This will fail if there are non-UUID values in the column
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ALTER COLUMN "idempotency_key" TYPE uuid USING idempotency_key::uuid`,
    );

    // Recreate the unique index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_PAYMENT_TRANSACTIONS_IDEMPOTENCY_KEY" ON "payment_transactions" ("idempotency_key")`,
    );
  }
}
