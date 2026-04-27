const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export type AuthUser = {
  id: number;
  email: string;
  role: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  user: AuthUser;
  token: string;
  refreshToken: string;
};

const authStorageKeys = {
  token: "pos_access_token",
  refreshToken: "pos_refresh_token",
  user: "pos_user",
} as const;

export async function login(payload: LoginPayload) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as Partial<LoginResponse> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Login gagal");
  }

  if (!data.user || !data.token || !data.refreshToken) {
    throw new Error("Response login tidak lengkap");
  }

  return data as LoginResponse;
}

export function saveAuthSession(session: LoginResponse) {
  localStorage.setItem(authStorageKeys.token, session.token);
  localStorage.setItem(authStorageKeys.refreshToken, session.refreshToken);
  localStorage.setItem(authStorageKeys.user, JSON.stringify(session.user));
}

export function getStoredUser() {
  const storedUser = localStorage.getItem(authStorageKeys.user);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem(authStorageKeys.user);
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(authStorageKeys.token);
  localStorage.removeItem(authStorageKeys.refreshToken);
  localStorage.removeItem(authStorageKeys.user);
}
