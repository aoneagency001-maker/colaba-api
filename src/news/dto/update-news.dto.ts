import { NewsCategory } from '../entities/news-article.entity.js';

export class UpdateNewsDto {
  title?: string;
  content?: string;
  previewImageUrl?: string;
  category?: NewsCategory;
  isPublished?: boolean;
}
