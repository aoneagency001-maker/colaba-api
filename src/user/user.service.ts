import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Customer } from './entities/customer.entity';
import { SellerProfile } from './entities/seller-profile.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(SellerProfile)
    private readonly sellerRepo: Repository<SellerProfile>,
  ) {}

  // ─── Users ─────────────────────────────────────────────────────

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { created_at: 'DESC' } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, data);
    return this.userRepo.save(user);
  }

  // ─── Customers ─────────────────────────────────────────────────

  async findAllCustomers(): Promise<Customer[]> {
    return this.customerRepo.find({ order: { created_at: 'DESC' } });
  }

  async findCustomerById(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findCustomerByUserId(userId: string): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { user_id: userId } });
  }

  // ─── Seller Profiles ──────────────────────────────────────────

  async createSeller(data: Partial<SellerProfile>): Promise<SellerProfile> {
    const seller = this.sellerRepo.create(data);
    return this.sellerRepo.save(seller);
  }

  async findSellersByStore(storeId: string): Promise<SellerProfile[]> {
    return this.sellerRepo.find({
      where: { store_id: storeId },
      relations: ['user'],
    });
  }
}
