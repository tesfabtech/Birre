
export type Category = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  deletedAt?: string | null;
};

export type CreateCategoryResponse = Category;

export type CategoryMutationResponse = {
  message: string;
  category: Category;
};

export type CategoryTrashConflict = {
  id: string;
  name: string;
  deletedAt?: string | null;
};
