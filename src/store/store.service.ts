import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
  ) {}

  async findAll(companyId?: string): Promise<Store[]> {
    const where: any = {};
    if (companyId) where.company_id = companyId;
    return this.storeRepo.find({ where, order: { created_at: 'DESC' } });
  }

  async findById(id: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async create(data: Partial<Store>): Promise<Store> {
    const store = this.storeRepo.create(data);
    return this.storeRepo.save(store);
  }

  async update(id: string, data: Partial<Store>): Promise<Store> {
    const store = await this.findById(id);
    Object.assign(store, data);
    return this.storeRepo.save(store);
  }
}
