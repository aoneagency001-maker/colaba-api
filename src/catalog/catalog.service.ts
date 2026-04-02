import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import { Category } from './entities/category.entity';
import { Product, BonusType } from './entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category) private readonly catRepo: Repository<Category>,
    @InjectRepository(Product) private readonly prodRepo: Repository<Product>,
  ) {}

  // ─── Categories ───────────────────────────────────────────

  async findAllCategories(): Promise<Category[]> {
    return this.catRepo.find({
      where: { parentId: IsNull(), isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findCategoryById(id: string): Promise<Category> {
    const cat = await this.catRepo.findOne({
      where: { id },
      relations: ['children'],
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    return this.catRepo.save(this.catRepo.create(dto));
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.findCategoryById(id);
    Object.assign(cat, dto);
    return this.catRepo.save(cat);
  }

  // ─── Products ─────────────────────────────────────────────

  async findAllProducts(options: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
  }): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const where: any = { isActive: true };
    if (options.categoryId) where.categoryId = options.categoryId;
    if (options.search) where.name = ILike(`%${options.search}%`);

    const [data, total] = await this.prodRepo.findAndCount({
      where,
      relations: ['category'],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findProductById(id: string): Promise<Product> {
    const prod = await this.prodRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!prod) throw new NotFoundException('Product not found');
    return prod;
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
    return this.prodRepo.save(this.prodRepo.create(dto));
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const prod = await this.findProductById(id);
    Object.assign(prod, dto);
    return this.prodRepo.save(prod);
  }

  async removeProduct(id: string): Promise<void> {
    const prod = await this.findProductById(id);
    prod.isActive = false;
    await this.prodRepo.save(prod);
  }

  // ─── Bonus calculation ────────────────────────────────────

  calculateBonus(product: Product, quantity: number): number {
    const base =
      product.bonusType === BonusType.PERCENT
        ? (Number(product.price) * Number(product.bonusValue) * quantity) / 100
        : Number(product.bonusValue) * quantity;
    return Math.round(base * Number(product.bonusMultiplier));
  }
}
