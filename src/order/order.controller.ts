import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/index';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.orderService.create(userId, dto);
  }

  @Get()
  findMyOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orderService.findByUser(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  confirm(@Param('id') id: string) {
    return this.orderService.confirm(id);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  cancel(@Param('id') id: string) {
    return this.orderService.cancel(id);
  }
}
