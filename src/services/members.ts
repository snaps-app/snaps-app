import { api } from './client';

export interface ProjectMember {
  user_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'visualizer';
  global_role?: string;
}

export const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  const response = await api.get(`/projects/${projectId}/members/`);
  return response.data;
};

export const addProjectMember = async (projectId: string, data: { email: string; role: string }) => {
  const response = await api.post(`/projects/${projectId}/members/`, data);
  return response.data;
};

export const updateMemberRole = async (projectId: string, userId: string, role: string) => {
  const response = await api.patch(`/projects/${projectId}/members/${userId}`, { role });
  return response.data;
};

export const removeMember = async (projectId: string, userId: string) => {
  await api.delete(`/projects/${projectId}/members/${userId}`);
};
