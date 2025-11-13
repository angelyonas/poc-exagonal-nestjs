import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IPaymentTransactionRepository } from '../../domain/contracts/payment-transaction-repository.interface';
import {
  PaymentTransaction,
  PaymentTransactionStateEnum,
} from '../../domain/entities/payment-transaction';
import { PaymentTransactionEntity } from '../orm/payment-transaction.entity';
import { NotFoundError } from '../../domain/errors/not-found.error';

/**
 * TypeORM implementation of Payment Transaction Repository
 * Handles persistence and retrieval of payment transactions from PostgreSQL
 */
@Injectable()
export class TypeOrmPaymentTransactionRepository
  implements IPaymentTransactionRepository
{
  constructor(
    @InjectRepository(PaymentTransactionEntity)
    private readonly repository: Repository<PaymentTransactionEntity>,
  ) {}

  /**
   * Save a new payment transaction
   */
  async save(transaction: PaymentTransaction): Promise<PaymentTransaction> {
    const entity = this.toEntity(transaction);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  /**
   * Update an existing payment transaction
   */
  async update(transaction: PaymentTransaction): Promise<PaymentTransaction> {
    if (!transaction.id) {
      throw new NotFoundError('PaymentTransaction', 'undefined');
    }

    const entity = this.toEntity(transaction);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  /**
   * Find payment transaction by ID
   */
  async findById(id: string): Promise<PaymentTransaction | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Find payment transaction by merchant reference
   */
  async findByMerchantReference(
    merchantReference: string,
  ): Promise<PaymentTransaction | null> {
    const entity = await this.repository.findOne({
      where: { merchantReference },
    });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Find payment transaction by idempotency key
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PaymentTransaction | null> {
    const entity = await this.repository.findOne({ where: { idempotencyKey } });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Find payment transaction by PSP reference
   */
  async findByPspReference(
    pspReference: string,
  ): Promise<PaymentTransaction | null> {
    const entity = await this.repository.findOne({ where: { pspReference } });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Delete payment transaction by ID
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Convert domain entity to TypeORM entity
   */
  private toEntity(domain: PaymentTransaction): PaymentTransactionEntity {
    const entity = new PaymentTransactionEntity();

    if (domain.id) {
      entity.id = domain.id;
    }

    entity.merchantReference = domain.merchantReference;
    entity.idempotencyKey = domain.idempotencyKey;
    entity.pspReference = domain.pspReference;
    entity.state = domain.state;
    entity.resultCode = domain.resultCode;
    entity.amountMinorUnits = domain.amountMinorUnits;
    entity.currencyCode = domain.currencyCode;
    entity.paymentMethodType = domain.paymentMethodType;
    entity.shopperEmail = domain.shopperEmail;
    entity.shopperReference = domain.shopperReference;
    entity.countryCode = domain.countryCode;
    entity.actionType = domain.actionType;
    entity.actionUrl = domain.actionUrl;
    entity.actionMethod = domain.actionMethod;
    entity.actionData = domain.actionData;
    entity.errorMessage = domain.errorMessage;

    if (domain.createdAt) {
      entity.createdAt = domain.createdAt;
    }
    if (domain.updatedAt) {
      entity.updatedAt = domain.updatedAt;
    }

    return entity;
  }

  /**
   * Convert TypeORM entity to domain entity
   */
  private toDomain(entity: PaymentTransactionEntity): PaymentTransaction {
    return PaymentTransaction.fromSchema({
      id: entity.id,
      merchantReference: entity.merchantReference,
      idempotencyKey: entity.idempotencyKey,
      pspReference: entity.pspReference,
      state: entity.state as PaymentTransactionStateEnum,
      resultCode: entity.resultCode,
      amountMinorUnits: entity.amountMinorUnits,
      currencyCode: entity.currencyCode,
      paymentMethodType: entity.paymentMethodType,
      shopperEmail: entity.shopperEmail,
      shopperReference: entity.shopperReference,
      countryCode: entity.countryCode,
      actionType: entity.actionType,
      actionUrl: entity.actionUrl,
      actionMethod: entity.actionMethod,
      actionData: entity.actionData,
      errorMessage: entity.errorMessage,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
