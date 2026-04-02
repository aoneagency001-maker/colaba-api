import { BonusType } from '../entities/product.entity.js';

export class CreateProductDto {
  name: string;
  description?: string;
  composition?: string;
  price: number;
  unit?: string;
  categoryId: string;
  bonusType?: BonusType;
  bonusValue?: number;
  bonusMultiplier?: number;
  images?: string[];
}
