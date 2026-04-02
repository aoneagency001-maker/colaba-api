import { BonusType } from '../entities/product.entity.js';

export class UpdateProductDto {
  name?: string;
  description?: string;
  composition?: string;
  price?: number;
  unit?: string;
  categoryId?: string;
  bonusType?: BonusType;
  bonusValue?: number;
  bonusMultiplier?: number;
  images?: string[];
  isActive?: boolean;
}
