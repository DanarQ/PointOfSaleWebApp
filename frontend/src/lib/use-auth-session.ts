"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeToSession,
} from "@/lib/session";

export function useAuthSession() {
  return useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
}
