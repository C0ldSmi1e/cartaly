import { z } from "zod";
import { pagination } from "@/src/config/constants";

const PaginationSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
});

const PaginatedDataSchema = <T>(data: z.ZodType<T>) =>
  z.object({
    data,
    pagination: PaginationSchema,
  });

const StandardResponseSchema = <T>(data: z.ZodType<T>) =>
  z.object({
    data: data.nullable(),
    error: z.string().nullable(),
    pagination: PaginationSchema.nullable(),
  });

type Pagination = z.infer<typeof PaginationSchema>;
type PaginatedData<T> = z.infer<ReturnType<typeof PaginatedDataSchema<T>>>;
type StandardResponse<T> = z.infer<ReturnType<typeof StandardResponseSchema<T>>>;

// Hybrid shape returned by every list-style action: pagination is present
// when the caller passed offset/limit, and null otherwise.
type ListResult<T> = { data: T[]; pagination: Pagination | null };

// The upper bound is the same hard cap an unpaginated GET is clamped to, so a
// caller can't page past what the route would return anyway. Single source of
// truth: src/config/constants.ts.
export const paginationQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(pagination.maxLimit).optional(),
});

export { StandardResponseSchema, PaginationSchema, PaginatedDataSchema };
export type { StandardResponse, Pagination, PaginatedData, ListResult };
