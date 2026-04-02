export class UpdateCategoryDto {
  name?: string;
  slug?: string;
  imageUrl?: string;
  sortOrder?: number;
  parentId?: string;
  isActive?: boolean;
}
