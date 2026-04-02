import { NewsCategory } from '../entities/news-article.entity.js';

export class CreateNewsDto {
  title: string;
  content: string;
  previewImageUrl?: string;
  category?: NewsCategory;
  isPublished?: boolean;
}
