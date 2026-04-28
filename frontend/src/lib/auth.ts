import { AuthUser, normalizeRole } from "@/types/auth";

type BackendUser = {
  id: number;
  email: string;
  role: string;
};

export type LoginResponse = {
  user: AuthUser;
  token: string;
  refreshToken: string;
};

type BackendLoginResponse = {
  user: BackendUser;
  token: string;
  refreshToken: string;
};

type BackendError = {
  error?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function parseBackendError(response: Response) {
  try {
    const body = (await response.json()) as BackendError;
    return body.error || "Login failed. Please check your email and password.";
  } catch {
    return "Login failed. Please check your email and password.";
  }
}

function normalizeLoginResponse(response: BackendLoginResponse): LoginResponse {
  return {
    ...response,
    user: {
      ...response.user,
      role: normalizeRole(response.user.role),
    },
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("Cannot connect to the backend. Make sure the API server is running.");
  }

  if (!response.ok) {
    throw new Error(await parseBackendError(response));
  }

  const body = (await response.json()) as BackendLoginResponse;
  return normalizeLoginResponse(body);
}
