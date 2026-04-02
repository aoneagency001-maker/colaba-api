import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsArticle, NewsCategory } from './entities/news-article.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle) private readonly newsRepo: Repository<NewsArticle>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    category?: NewsCategory,
  ) {
    const where: any = { isPublished: true };
    if (category) where.category = category;

    const [items, total] = await this.newsRepo.findAndCount({
      where,
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<NewsArticle> {
    const article = await this.newsRepo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('News article not found');
    return article;
  }

  async create(dto: CreateNewsDto): Promise<NewsArticle> {
    const article = this.newsRepo.create(dto);
    if (dto.isPublished) {
      article.publishedAt = new Date();
    }
    return this.newsRepo.save(article);
  }

  async update(id: string, dto: UpdateNewsDto): Promise<NewsArticle> {
    const article = await this.findById(id);
    const wasPublished = article.isPublished;
    Object.assign(article, dto);
    if (!wasPublished && dto.isPublished) {
      article.publishedAt = new Date();
    }
    return this.newsRepo.save(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.findById(id);
    await this.newsRepo.remove(article);
  }
}
