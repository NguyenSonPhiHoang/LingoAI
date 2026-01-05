export interface User {
  id: string;
  email?: string;
  displayName?: string;
  passwordHash?: string | null;
  roleId?: string | null;
  status?: string | null;
  createdAt?: string; // ISO
}
