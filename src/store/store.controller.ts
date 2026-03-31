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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'List stores' })
  @ApiQuery({ name: 'company_id', required: false })
  findAll(@Query('company_id') companyId?: string) {
    return this.storeService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  findById(@Param('id') id: string) {
    return this.storeService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create store' })
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  create(@Body() body: Partial<any>) {
    return this.storeService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update store' })
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  update(@Param('id') id: string, @Body() body: Partial<any>) {
    return this.storeService.update(id, body);
  }
}
