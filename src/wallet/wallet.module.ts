import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { LedgerEntry } from '../transaction/entities/ledger-entry.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TransactionModule } from '../transaction/transaction.module';
import { BonusLotModule } from '../bonus-lot/bonus-lot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, LedgerEntry]),
    forwardRef(() => TransactionModule),
    forwardRef(() => BonusLotModule),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
