/**
 * Client-side demo/offline authentication for GitHub Pages static deployment.
 * When no backend API is available, the app uses these hardcoded credentials
 * so users can explore the UI without a running server.
 */

import type { User } from "./api";

// ─── Demo users ──────────────────────────────────────────────────────────────

interface DemoAccount {
  email: string;
  password: string;
  user: User;
}

export const DEMO_USERS: DemoAccount[] = [
  {
    email: "admin@library.demo",
    password: "admin123",
    user: {
      id: "demo-admin-001",
      name: "Demo Administrator",
      email: "admin@library.demo",
      username: "admin",
      roles: ["super_admin", "branch_admin", "librarian"],
      memberType: "faculty",
      isActive: true,
    },
  },
  {
    email: "member@library.demo",
    password: "member123",
    user: {
      id: "demo-member-001",
      name: "Demo Member",
      email: "member@library.demo",
      username: "member",
      roles: ["member"],
      memberType: "student",
      isActive: true,
    },
  },
];

// ─── Token ↔ user mapping ────────────────────────────────────────────────────

const tokenUserMap: Record<string, User> = {
  "demo-access-token-admin": DEMO_USERS[0].user,
  "demo-access-token-member": DEMO_USERS[1].user,
};

// ─── Demo mode check (evaluated once, cached) ───────────────────────────────

let _isDemoMode: boolean | null = null;

export function isDemoMode(): boolean {
  if (_isDemoMode === null) {
    const url = process.env.NEXT_PUBLIC_API_URL ?? "";
    _isDemoMode = url === "" || !url.startsWith("http");
  }
  return _isDemoMode;
}

// ─── Demo auth functions ─────────────────────────────────────────────────────

export function demoLogin(identity: string, password: string) {
  const account = DEMO_USERS.find(
    (a) =>
      (a.email === identity.toLowerCase() ||
        a.user.username === identity.toLowerCase()) &&
      a.password === password,
  );
  if (!account) {
    throw new Error("Invalid credentials");
  }

  const isAdmin = account.user.roles.includes("super_admin");
  const accessToken = isAdmin
    ? "demo-access-token-admin"
    : "demo-access-token-member";
  const refreshToken = `demo-refresh-token-${account.user.id}`;

  return {
    accessToken,
    refreshToken,
    user: account.user,
  };
}

export function demoGetMe(token: string): User {
  const user = tokenUserMap[token];
  if (!user) {
    throw new Error("Invalid or expired token");
  }
  return user;
}

export function demoRefreshToken() {
  return {
    accessToken: "demo-access-token-admin",
    refreshToken: "demo-refresh-token-refreshed",
    expiresIn: 900,
  };
}
