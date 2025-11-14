import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Payment Transaction TypeORM Entity
 * Represents a payment transaction record in the database
 */
@Entity('payment_transactions')
@Index(['merchantReference'], { unique: true })
@Index(['idempotencyKey'], { unique: true })
@Index(['pspReference'])
@Index(['state'])
@Index(['createdAt'])
export class PaymentTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_reference', type: 'varchar', length: 100 })
  merchantReference: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100 })
  idempotencyKey: string;

  @Column({
    name: 'psp_reference',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  pspReference: string | null;

  @Column({ type: 'varchar', length: 20 })
  state: string;

  @Column({ name: 'result_code', type: 'varchar', length: 50, nullable: true })
  resultCode: string | null;

  @Column({ name: 'amount_minor_units', type: 'bigint' })
  amountMinorUnits: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3 })
  currencyCode: string;

  @Column({ name: 'payment_method_type', type: 'varchar', length: 50 })
  paymentMethodType: string;

  @Column({
    name: 'shopper_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  shopperEmail: string | null;

  @Column({
    name: 'shopper_reference',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  shopperReference: string | null;

  @Column({ name: 'country_code', type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ name: 'action_type', type: 'varchar', length: 50, nullable: true })
  actionType: string | null;

  @Column({ name: 'action_url', type: 'text', nullable: true })
  actionUrl: string | null;

  @Column({
    name: 'action_method',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  actionMethod: string | null;

  @Column({ name: 'action_data', type: 'jsonb', nullable: true })
  actionData: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
