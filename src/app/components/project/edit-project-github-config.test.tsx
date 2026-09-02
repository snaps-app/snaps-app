import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditProjectGithubConfig } from './edit-project-github-config';
import { syncGithubProject, upsertGithubConfig } from '@/services/projects';

vi.mock('@/services/projects', () => ({
  syncGithubProject: vi.fn(),
  upsertGithubConfig: vi.fn(),
}));

const props = () => ({
  projectId: 'project-id', repoOwner: 'owner', repoNames: 'repo',
  setRepoOwner: vi.fn(), setRepoNames: vi.fn(),
  githubPat: '', setGithubPat: vi.fn(),
  hasSavedConfig: true, hasUnsavedConfigChanges: false, setHasSavedConfig: vi.fn(),
  lastSyncAt: '',
  syncStatus: 'idle', setSyncStatus: vi.fn(),
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(syncGithubProject).mockResolvedValue({ message: 'Sync triggered' });
});
afterEach(cleanup);

describe('GitHub configuration with a write-only credential', () => {
  it('syncs saved configuration without retrieving or resubmitting the PAT', async () => {
    const values = props();
    render(<EditProjectGithubConfig {...values} />);
    fireEvent.click(screen.getByRole('button', { name: /Sync with GitHub Now/i }));
    await waitFor(() => expect(syncGithubProject).toHaveBeenCalledWith('project-id'));
    expect(upsertGithubConfig).not.toHaveBeenCalled();
    expect(values.setSyncStatus).toHaveBeenCalledWith('syncing');
  });

  it('does not enable a new integration without a PAT', () => {
    render(<EditProjectGithubConfig {...props()} hasSavedConfig={false} />);
    const button = screen.getByRole('button', { name: /Sync with GitHub Now/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('requires a new PAT after repository fields are changed', () => {
    render(<EditProjectGithubConfig {...props()} hasUnsavedConfigChanges />);
    const button = screen.getByRole('button', { name: /Sync with GitHub Now/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('clears a newly supplied credential after saving it and then triggers sync', async () => {
    const values = { ...props(), githubPat: 'fixture-only', hasSavedConfig: false };
    render(<EditProjectGithubConfig {...values} />);
    fireEvent.click(screen.getByRole('button', { name: /Sync with GitHub Now/i }));
    await waitFor(() => expect(syncGithubProject).toHaveBeenCalledWith('project-id'));
    expect(upsertGithubConfig).toHaveBeenCalledWith('project-id', {
      repo_owner: 'owner', repo_names: 'repo', github_pat: 'fixture-only',
    });
    expect(values.setGithubPat).toHaveBeenCalledWith('');
    expect(values.setHasSavedConfig).toHaveBeenCalledWith(true);
  });
});
