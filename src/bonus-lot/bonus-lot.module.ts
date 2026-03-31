import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BonusLot } from './entities/bonus-lot.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { BonusLotService } from './bonus-lot.service';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BonusLot, Wallet]),
    forwardRef(() => TransactionModule),
  ],
  providers: [BonusLotService],
  exports: [BonusLotService],
})
export class BonusLotModule {}
