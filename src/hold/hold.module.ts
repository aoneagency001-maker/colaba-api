import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hold } from './entities/hold.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { HoldService } from './hold.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hold, Wallet])],
  providers: [HoldService],
  exports: [HoldService],
})
export class HoldModule {}
