export type UserRole = "admin" | "user";

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
};

export type StoredAuth = {
  user: AuthUser;
  token: string;
  refreshToken: string;
};

export function normalizeRole(role: string | null | undefined): UserRole {
  return role === "admin" ? "admin" : "user";
}

export function getRoleLabel(role: UserRole) {
  return role === "admin" ? "Admin" : "Kasir";
}
