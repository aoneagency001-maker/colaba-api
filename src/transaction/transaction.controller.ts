import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  QuoteTransactionDto,
  ReverseTransactionDto,
} from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * POST /transaction/quote
   * Pre-calculate a transaction without committing.
   */
  @Post('quote')
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN, UserRole.SELLER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async quote(@Body() dto: QuoteTransactionDto) {
    return this.transactionService.quote(dto);
  }

  /**
   * POST /transaction/create
   * Create a confirmed transaction with double-entry ledger entries.
   */
  @Post('create')
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN, UserRole.SELLER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateTransactionDto) {
    return this.transactionService.create(dto);
  }

  /**
   * POST /transaction/reverse
   * Reverse an existing transaction.
   */
  @Post('reverse')
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async reverse(@Body() dto: ReverseTransactionDto) {
    return this.transactionService.reverse(
      dto.transaction_id,
      dto.actor_user_id,
      dto.reason,
    );
  }

  /**
   * GET /transaction/history?wallet_id=...&page=1&limit=20&type=...&status=...
   * Paginated transaction history for a wallet (any authenticated role).
   */
  @Get('history')
  async getHistory(
    @Query('wallet_id') walletId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.transactionService.getHistory(walletId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      type: type as any,
      status: status as any,
    });
  }
}
