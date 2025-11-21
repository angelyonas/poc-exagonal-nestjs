import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePaymentTransactions1731606542433
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'merchant_reference',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'psp_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'result_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'amount_minor_units',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'currency_code',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'payment_method_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'shopper_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'shopper_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'country_code',
            type: 'varchar',
            length: '2',
            isNullable: true,
          },
          {
            name: 'action_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'action_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'action_method',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'action_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique index on merchant_reference
    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_PAYMENT_TRANSACTIONS_MERCHANT_REFERENCE',
        columnNames: ['merchant_reference'],
        isUnique: true,
      }),
    );

    // Create unique index on idempotency_key
    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_PAYMENT_TRANSACTIONS_IDEMPOTENCY_KEY',
        columnNames: ['idempotency_key'],
        isUnique: true,
      }),
    );

    // Create index on psp_reference for lookups
    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_PAYMENT_TRANSACTIONS_PSP_REFERENCE',
        columnNames: ['psp_reference'],
      }),
    );

    // Create index on state for filtering
    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_PAYMENT_TRANSACTIONS_STATE',
        columnNames: ['state'],
      }),
    );

    // Create index on created_at for time-based queries
    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_PAYMENT_TRANSACTIONS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'payment_transactions',
      'IDX_PAYMENT_TRANSACTIONS_CREATED_AT',
    );
    await queryRunner.dropIndex(
      'payment_transactions',
      'IDX_PAYMENT_TRANSACTIONS_STATE',
    );
    await queryRunner.dropIndex(
      'payment_transactions',
      'IDX_PAYMENT_TRANSACTIONS_PSP_REFERENCE',
    );
    await queryRunner.dropIndex(
      'payment_transactions',
      'IDX_PAYMENT_TRANSACTIONS_IDEMPOTENCY_KEY',
    );
    await queryRunner.dropIndex(
      'payment_transactions',
      'IDX_PAYMENT_TRANSACTIONS_MERCHANT_REFERENCE',
    );

    // Drop table
    await queryRunner.dropTable('payment_transactions');
  }
}
