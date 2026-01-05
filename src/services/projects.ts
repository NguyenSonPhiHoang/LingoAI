import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export interface UserProject {
  Id: string;
  UserId: string;
  Name: string;
  Description?: string | null;
  Data?: any;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export async function listProjects(): Promise<UserProject[]> {
  return apiGet<UserProject[]>("/api/projects");
}

export async function getProject(id: string): Promise<UserProject> {
  return apiGet<UserProject>(`/api/projects/${id}`);
}

export async function createProject(input: {
  name: string;
  description?: string;
  data?: any;
}): Promise<UserProject> {
  return apiPost<UserProject>("/api/projects", {
    name: input.name,
    description: input.description || null,
    data: input.data || null,
  });
}

export async function updateProject(
  id: string,
  input: {
    name: string;
    description?: string;
    data?: any;
  }
): Promise<UserProject> {
  return apiPut<UserProject>(`/api/projects/${id}`, {
    name: input.name,
    description: input.description || null,
    data: input.data || null,
  });
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  return apiDelete<{ ok: boolean }>(`/api/projects/${id}`);
}

export default {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
};
