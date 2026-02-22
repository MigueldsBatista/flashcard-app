import { vi } from 'vitest';

export const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
  },
  from: vi.fn((table) => {
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [] }),
      insert: vi.fn((data) => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-id-' + Math.random().toString(36).substr(2, 9),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...data
              // Map camelCase to snake_case if needed manually, but here we just pass what we got
              // actually store sends snake_case to insert.
            },
            error: null
          })
        }))
      })),
      update: vi.fn((updates) => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    };
  })
};
