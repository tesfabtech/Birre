
import { apiRequest } from '@/api';
import type {
  Category,
  CategoryMutationResponse,
  CreateCategoryResponse,
} from '@/types/category';

export const categoryService = {
  list(): Promise<Category[]> {
    return apiRequest<Category[]>('/categories');
  },

  listTrash(): Promise<Category[]> {
    return apiRequest<Category[]>('/categories/trash');
  },

  create(name: string): Promise<CreateCategoryResponse> {
    return apiRequest<CreateCategoryResponse>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  delete(id: string): Promise<CategoryMutationResponse> {
    return apiRequest<CategoryMutationResponse>(
      `/categories/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  },

  restore(id: string): Promise<CategoryMutationResponse> {
    return apiRequest<CategoryMutationResponse>(
      `/categories/${encodeURIComponent(id)}/restore`,
      { method: 'POST' },
    );
  },
};
