export class CreateOrderItemDto {
  productId: string;
  quantity: number;
}

export class CreateOrderDto {
  items: CreateOrderItemDto[];
  useBonuses?: number;
}
