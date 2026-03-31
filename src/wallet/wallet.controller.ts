import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { BonusLotService } from '../bonus-lot/bonus-lot.service';
import { TransactionService } from '../transaction/transaction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly bonusLotService: BonusLotService,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * GET /wallet/balance
   * Returns all wallets and balances for the current user.
   */
  @Get('balance')
  async getBalance(@CurrentUser() user: any) {
    const customerId: string = user?.id ?? user?.sub;
    const wallets = await this.walletService.getCustomerWallets(customerId);

    return {
      wallets: wallets.map((w) => ({
        id: w.id,
        wallet_type: w.wallet_type,
        balance: Number(w.balance_cached),
        currency: w.currency,
        status: w.status,
      })),
    };
  }

  /**
   * GET /wallet/history?wallet_id=...&page=1&limit=20&type=...
   * Transaction history for a specific wallet.
   */
  @Get('history')
  async getHistory(
    @Query('wallet_id') walletId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.transactionService.getHistory(walletId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      type: type as any,
    });
  }

  /**
   * GET /wallet/expiring?wallet_id=...&days=30
   * Bonus lots expiring within the given period.
   */
  @Get('expiring')
  async getExpiring(
    @Query('wallet_id') walletId: string,
    @Query('days') days?: string,
  ) {
    const withinDays = days ? parseInt(days, 10) : 30;
    const lots = await this.bonusLotService.getExpiringLots(walletId, withinDays);

    return {
      expiring_lots: lots.map((l) => ({
        id: l.id,
        amount_remaining: Number(l.amount_remaining),
        expires_at: l.expires_at,
        created_at: l.created_at,
      })),
      total_expiring: lots.reduce((sum, l) => sum + Number(l.amount_remaining), 0),
    };
  }
}
