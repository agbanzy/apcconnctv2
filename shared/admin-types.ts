import { z } from "zod";

// Paginated response type for admin list endpoints
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Generic filter DTO for list endpoints
export interface FilterDTO {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any; // Entity-specific filters
}

// Bulk actions enum
export enum BulkAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  BAN = 'ban',
  UNBAN = 'unban',
  DELETE = 'delete',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  VERIFY = 'verify',
  UNVERIFY = 'unverify'
}

// Zod schema for filter validation
export const filterSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Zod schema for bulk action validation
export const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.nativeEnum(BulkAction),
});

export type BulkActionInput = z.infer<typeof bulkActionSchema>;
