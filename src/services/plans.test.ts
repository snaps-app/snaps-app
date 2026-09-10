import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { api } from '@/services/client';
import { approvePlan, updatePlan } from '@/services/plans';

beforeEach(() => vi.clearAllMocks());

describe('plan integrity writes', () => {
  it('sends the revision read by the editor with a content update', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { id: 'plan-1', content_revision: 5 },
    });

    await updatePlan('plan-1', {
      content: 'new content',
      expected_content_revision: 4,
    });

    expect(api.patch).toHaveBeenCalledWith('/plans/plan-1', {
      content: 'new content',
      expected_content_revision: 4,
    });
  });

  it('uses the explicit approval endpoint with revision and evidence', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'plan-1', approved_content_hash: 'abc' },
    });

    await approvePlan('plan-1', 7, 'cockpit:user-confirmed');

    expect(api.post).toHaveBeenCalledWith('/plans/plan-1/approve', {
      expected_content_revision: 7,
      evidence_ref: 'cockpit:user-confirmed',
    });
  });
});
