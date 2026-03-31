// ─── Роли ───
export enum UserRole {
  ADMIN = 'admin',
  COMPANY_ADMIN = 'company_admin',
  SELLER = 'seller',
  CUSTOMER = 'customer',
}

// ─── Типы кошельков ───
export enum WalletType {
  BONUS = 'bonus_wallet',
  DEPOSIT = 'deposit_wallet',
  BURN = 'burn_wallet',
  SYSTEM_FEE = 'system_fee_wallet',
}

// ─── Типы транзакций ───
export enum TransactionType {
  BONUS_ACCRUAL = 'bonus_accrual',
  BONUS_SPEND = 'bonus_spend',
  REVERSAL = 'reversal',
  BURN = 'burn',
  REFERRAL_REWARD = 'referral_reward',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  COMMISSION_CHARGE = 'commission_charge',
  MIGRATION = 'migration_adjustment',
}

// ─── Статусы транзакций ───
export enum TransactionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SETTLED = 'settled',
  REVERSED = 'reversed',
  FAILED = 'failed',
}

// ─── Статусы hold ───
export enum HoldStatus {
  ACTIVE = 'active',
  RELEASED = 'released',
  CAPTURED = 'captured',
  EXPIRED = 'expired',
}

// ─── Ledger entry type ───
export enum LedgerEntryType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

// ─── Общие статусы ───
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}
