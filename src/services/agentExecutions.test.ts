import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/services/client';
import {
  advanceAgentExecution,
  createAgentExecution,
  deleteAgentExecution,
  rollbackAgentExecution,
  syncAgentExecution,
  updateAgentExecutionStatus,
} from '@/services/agentExecutions';

vi.mock('@/services/client', () => ({
  api: {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const response = { data: { id: 'execution' } };

describe('durable execution client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue(response);
    vi.mocked(api.patch).mockResolvedValue(response);
    vi.mocked(api.delete).mockResolvedValue(response);
  });

  it('sends a command key and revision for every state-changing operation', async () => {
    await createAgentExecution({
      project_id: 'project', phase: 'execution', sprint_ids: [], card_ids: [],
    });
    await syncAgentExecution('execution', 'mission', [], [], [], 7);
    await updateAgentExecutionStatus('execution', 'in_progress', 8);
    await rollbackAgentExecution('execution', 'planning', 9);
    await deleteAgentExecution('execution', 10);

    const mutationCalls = [
      vi.mocked(api.post).mock.calls[0],
      vi.mocked(api.post).mock.calls[1],
      vi.mocked(api.patch).mock.calls[0],
      vi.mocked(api.patch).mock.calls[1],
      vi.mocked(api.delete).mock.calls[0],
    ];
    for (const call of mutationCalls) {
      const config = call[call.length - 1] as { headers?: Record<string, string> };
      expect(config.headers?.['Idempotency-Key']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
    expect(vi.mocked(api.post).mock.calls[1][1]).toMatchObject({ expected_revision: 7 });
    expect(vi.mocked(api.patch).mock.calls[0][1]).toMatchObject({ expected_revision: 8 });
    expect(vi.mocked(api.patch).mock.calls[1][2]).toMatchObject({
      params: { expected_revision: 9 },
    });
    expect(vi.mocked(api.delete).mock.calls[0][1]).toMatchObject({
      params: { expected_revision: 10 },
    });
  });

  it('sends only the named conditions covered by the human decision', async () => {
    await advanceAgentExecution(
      'execution', 'mission', [], [], true, 11, 'decision', ['ci_passed'],
    );

    expect(api.patch).toHaveBeenCalledWith(
      '/api/agent-executions/execution/advance',
      expect.objectContaining({
        force: true,
        expected_revision: 11,
        override_decision_id: 'decision',
        override_conditions: ['ci_passed'],
      }),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
