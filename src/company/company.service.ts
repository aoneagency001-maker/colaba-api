import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async findAll(): Promise<Company[]> {
    return this.companyRepo.find({ order: { created_at: 'DESC' } });
  }

  async findById(id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(data: Partial<Company>): Promise<Company> {
    const company = this.companyRepo.create(data);
    return this.companyRepo.save(company);
  }

  async update(id: string, data: Partial<Company>): Promise<Company> {
    const company = await this.findById(id);
    Object.assign(company, data);
    return this.companyRepo.save(company);
  }
}
