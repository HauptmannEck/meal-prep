export interface ShoppingItem {
  item: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  prepTime: number;
  tags: string[];
  shoppingList: ShoppingItem[];
  procedure: string[];
  createdAt: number;
  rating?: number;
  feedback?: string;
}

export type ViewState = 'dashboard' | 'generate' | 'detail';
