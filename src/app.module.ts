import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { StoreModule } from './store/store.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { HoldModule } from './hold/hold.module';
import { BonusLotModule } from './bonus-lot/bonus-lot.module';
import { NotificationModule } from './notification/notification.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // ─── Config ────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ─── Database ──────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'colaba'),
        password: config.get<string>('DB_PASSWORD', 'colaba'),
        database: config.get<string>('DB_DATABASE', 'colaba_ltv'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // ─── Scheduler ─────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Domain modules ────────────────────────────────────────
    AuthModule,
    UserModule,
    CompanyModule,
    StoreModule,
    WalletModule,
    TransactionModule,
    HoldModule,
    BonusLotModule,
    NotificationModule,
    AuditModule,
  ],
})
export class AppModule {}
