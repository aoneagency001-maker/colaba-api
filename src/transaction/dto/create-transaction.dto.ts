import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { TransactionType } from '../../common/enums';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @MaxLength(3)
  currency: string;

  @IsUUID()
  source_wallet_id: string;

  @IsUUID()
  target_wallet_id: string;

  @IsString()
  @MaxLength(255)
  idempotency_key: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  meta_json?: Record<string, any>;
}

export class QuoteTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @MaxLength(3)
  currency: string;

  @IsUUID()
  source_wallet_id: string;

  @IsUUID()
  target_wallet_id: string;
}

export class ReverseTransactionDto {
  @IsUUID()
  transaction_id: string;

  @IsUUID()
  actor_user_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
