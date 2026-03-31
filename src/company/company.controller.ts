import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'List companies' })
  findAll() {
    return this.companyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findById(@Param('id') id: string) {
    return this.companyService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create company' })
  @Roles(UserRole.ADMIN)
  create(@Body() body: Partial<any>) {
    return this.companyService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update company' })
  @Roles(UserRole.ADMIN, UserRole.COMPANY_ADMIN)
  update(@Param('id') id: string, @Body() body: Partial<any>) {
    return this.companyService.update(id, body);
  }
}
