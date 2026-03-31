import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('sub') userId: string) {
    const user = await this.userService.findById(userId);
    const customer = await this.userService.findCustomerByUserId(userId);
    return { user, customer };
  }

  @Get()
  @ApiOperation({ summary: 'List users' })
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  update(@Param('id') id: string, @Body() body: Partial<any>) {
    return this.userService.update(id, body);
  }
}

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List customers' })
  findAll() {
    return this.userService.findAllCustomers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findById(@Param('id') id: string) {
    return this.userService.findCustomerById(id);
  }
}

@ApiTags('Sellers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sellers')
export class SellerController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create seller profile' })
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  create(@Body() body: Partial<any>) {
    return this.userService.createSeller(body);
  }

  @Get()
  @ApiOperation({ summary: 'List sellers by store' })
  findByStore(@Query('store_id') storeId: string) {
    return this.userService.findSellersByStore(storeId);
  }
}
