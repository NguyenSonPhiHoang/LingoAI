import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export interface AdminUserRow {
  Id: string;
  Email?: string;
  DisplayName?: string;
  RoleId?: string;
  CreatedAt?: string;
  Status?: string;
  OmniChatEnabled?: boolean;
}

export interface AdminListResult {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const adminListUsers = async (
  params: Record<string, any>
): Promise<AdminListResult> => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  });
  return apiGet<AdminListResult>(`/api/users/admin?${qs.toString()}`);
};

export const adminGetUser = async (id: string) =>
  apiGet<AdminUserRow>(`/api/users/admin/${id}`);
export const adminCreateUser = async (payload: any) =>
  apiPost(`/api/users/admin`, payload);
export const adminUpdateUser = async (id: string, payload: any) =>
  apiPut(`/api/users/admin/${id}`, payload);
export const adminDeleteUser = async (id: string) =>
  apiDelete(`/api/users/admin/${id}`);
