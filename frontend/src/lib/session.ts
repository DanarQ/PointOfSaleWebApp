"use client";

import { AuthUser, StoredAuth, normalizeRole } from "@/types/auth";

const USER_KEY = "pos_user";
const TOKEN_KEY = "pos_token";
const REFRESH_TOKEN_KEY = "pos_refresh_token";
const AUTH_CHANGE_EVENT = "pos-auth-change";

type StoredUserShape = Omit<AuthUser, "role"> & {
  role?: string;
};

type SessionRawValues = {
  userJson: string | null;
  token: string | null;
  refreshToken: string;
};

let cachedRawValues: SessionRawValues | null = null;
let cachedSnapshot: StoredAuth | null = null;

function readRawValues(): SessionRawValues {
  return {
    userJson: window.localStorage.getItem(USER_KEY),
    token: window.localStorage.getItem(TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? "",
  };
}

function hasSameRawValues(first: SessionRawValues | null, second: SessionRawValues) {
  return (
    first?.userJson === second.userJson &&
    first?.token === second.token &&
    first?.refreshToken === second.refreshToken
  );
}

function parseStoredAuth(rawValues: SessionRawValues): StoredAuth | null {
  const { userJson, token, refreshToken } = rawValues;

  if (!userJson || !token) {
    return null;
  }

  try {
    const storedUser = JSON.parse(userJson) as StoredUserShape;

    return {
      token,
      refreshToken,
      user: {
        id: storedUser.id,
        email: storedUser.email,
        role: normalizeRole(storedUser.role),
      },
    };
  } catch {
    return null;
  }
}

export function readStoredAuth(): StoredAuth | null {
  const userJson = window.localStorage.getItem(USER_KEY);
  const token = window.localStorage.getItem(TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";

  if (!userJson || !token) {
    return null;
  }

  try {
    const storedUser = JSON.parse(userJson) as StoredUserShape;

    return {
      token,
      refreshToken,
      user: {
        id: storedUser.id,
        email: storedUser.email,
        role: normalizeRole(storedUser.role),
      },
    };
  } catch {
    clearStoredAuth();
    return null;
  }
}

export function getSessionSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValues = readRawValues();

  if (hasSameRawValues(cachedRawValues, rawValues)) {
    return cachedSnapshot;
  }

  cachedRawValues = rawValues;
  cachedSnapshot = parseStoredAuth(rawValues);

  return cachedSnapshot;
}

export function getServerSessionSnapshot() {
  return null;
}

export function subscribeToSession(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
  };
}

function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function saveStoredAuth(auth: StoredAuth) {
  window.localStorage.setItem(TOKEN_KEY, auth.token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  cachedRawValues = null;
  cachedSnapshot = null;
  emitAuthChange();
}

export function clearStoredAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  cachedRawValues = null;
  cachedSnapshot = null;
  emitAuthChange();
}
