import { NewsCategory } from '../entities/news-article.entity';

export class UpdateNewsDto {
  title?: string;
  content?: string;
  previewImageUrl?: string;
  category?: NewsCategory;
  isPublished?: boolean;
}
