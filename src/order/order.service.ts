import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderItem } from './entities/order.entity.js';
import { Product } from '../catalog/entities/product.entity.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product) private readonly prodRepo: Repository<Product>,
    private readonly catalogService: CatalogService,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    const items: OrderItem[] = [];
    let totalAmount = 0;
    let totalBonusEarned = 0;

    for (const item of dto.items) {
      const product = await this.catalogService.findProductById(item.productId);
      const lineTotal = Number(product.price) * item.quantity;
      const bonusEarned = this.catalogService.calculateBonus(product, item.quantity);

      items.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: Number(product.price),
        unit: product.unit || '',
        bonusEarned,
      });

      totalAmount += lineTotal;
      totalBonusEarned += bonusEarned;
    }

    const bonusDiscount = dto.useBonuses || 0;
    const finalAmount = totalAmount - bonusDiscount;

    if (finalAmount < 0) {
      throw new BadRequestException('Bonus discount exceeds order total');
    }

    return this.orderRepo.save(
      this.orderRepo.create({
        userId,
        totalAmount,
        bonusDiscount,
        finalAmount,
        totalBonusEarned,
        status: OrderStatus.PENDING,
        items,
      }),
    );
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Order[]; total: number }> {
    const [data, total] = await this.orderRepo.findAndCount({
      where: { userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findById(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async confirm(id: string): Promise<Order> {
    const order = await this.findById(id);
    order.status = OrderStatus.CONFIRMED;
    return this.orderRepo.save(order);
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findById(id);
    order.status = OrderStatus.CANCELLED;
    return this.orderRepo.save(order);
  }
}
