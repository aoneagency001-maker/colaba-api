import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity.js';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { CatalogModule } from '../catalog/catalog.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), CatalogModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
