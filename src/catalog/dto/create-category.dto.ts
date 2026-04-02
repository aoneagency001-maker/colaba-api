export class CreateCategoryDto {
  name: string;
  slug: string;
  imageUrl?: string;
  sortOrder?: number;
  parentId?: string;
}
