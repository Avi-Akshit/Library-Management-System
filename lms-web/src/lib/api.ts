import { isDemoMode, demoLogin, demoGetMe, demoRefreshToken } from "./demo-auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiFetch(path: string, options: RequestInit = {}) {
  // In demo mode, return safe defaults for any API call not explicitly handled
  if (isDemoMode()) {
    const method = (options.method ?? "GET").toUpperCase();
    if (method === "GET") return [];
    return {};
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || `API error ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ─── Type interfaces ────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  roles: string[];
  memberType: string;
  isActive: boolean;
}

export interface ItemCopy {
  _id: string;
  barcode: string;
  branchId: string;
  status: 'available' | 'checked_out' | 'reserved' | 'in_transfer' | 'lost' | 'maintenance';
}

export interface Item {
  _id: string;
  title: string;
  creators: string[];
  itemType: string;
  subjects: string[];
  description?: string;
  copies: ItemCopy[];
  workId?: string;
  format?: string;
  language?: string;
  genres?: string[];
  subcategory?: string;
  donatedBy?: string;
  _score?: number;
}

export interface Loan {
  _id: string;
  itemId: string;
  status: 'active' | 'returned' | 'overdue';
  dueAt: string;
  renewalCount: number;
  checkoutAt: string;
}

export interface Hold {
  _id: string;
  itemId: string;
  position: number;
  status: 'queued' | 'ready' | 'fulfilled' | 'expired' | 'cancelled';
  readyAt?: string;
  expiresAt?: string;
}

export interface FineLedgerEntry {
  _id: string;
  type: 'fine' | 'waiver' | 'payment';
  amountCents: number;
  reason: string;
  createdAt: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(identity: string, password: string) {
  if (isDemoMode()) return demoLogin(identity, password);
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identity, password }),
  });
}

export async function register(name: string, email: string, password: string, username?: string) {
  if (isDemoMode()) throw new Error("Registration is not available in demo mode");
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, username }),
  });
}

export async function getMe(): Promise<User> {
  if (isDemoMode()) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return demoGetMe(token ?? "");
  }
  return apiFetch('/auth/me');
}

export async function refreshToken(rt: string) {
  if (isDemoMode()) return demoRefreshToken();
  return apiFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: rt }),
  });
}

export async function logout(rt: string) {
  if (isDemoMode()) return null;
  return apiFetch('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: rt }),
  });
}

export async function requestPasswordReset(identity: string) {
  return apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identity }) });
}

export async function resetPassword(token: string, password: string) {
  return apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
}

export async function changePassword(currentPassword: string, password: string) {
  return apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, password }) });
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export async function getCatalog(params: Record<string, string> = {}): Promise<Item[]> {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/catalog/items${query ? `?${query}` : ''}`);
}

export async function getItem(id: string): Promise<Item> {
  return apiFetch(`/catalog/items/${id}`);
}

export async function getEditions(id: string): Promise<{ workId?: string; editions: Item[] }> { return apiFetch(`/catalog/items/${id}/editions`); }
export interface Room { _id: string; name: string; capacity: number; isEnabled: boolean; }
export interface RoomBooking { _id: string; roomId: string; startsAt: string; endsAt: string; }
export async function getRooms(): Promise<Room[]> { return apiFetch("/rooms"); }
export async function getRoomBookings(roomId: string, date: string): Promise<RoomBooking[]> { return apiFetch(`/rooms/${roomId}/bookings?date=${date}`); }
export async function createRoomBooking(input: { roomId: string; startsAt: string; endsAt: string }) { return apiFetch("/rooms/bookings", { method: "POST", body: JSON.stringify(input) }); }
export async function updateRoom(id: string, patch: Partial<Pick<Room, "isEnabled" | "capacity">>) { return apiFetch(`/rooms/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); }
export async function askLibrarian(question: string): Promise<{ answer: string; references: Array<{ id: string; title: string; creators: string[]; availableCopies: number }> }> { return apiFetch("/assistant/ask", { method: "POST", body: JSON.stringify({ question }) }); }
export async function getDonorReport() { return apiFetch("/catalog/reports/donors"); }

export interface FacetValue { value: string; count: number; selected: boolean; }
export interface FacetedSearch { items: Item[]; facets: { genres: FacetValue[]; subcategories: FacetValue[]; formats: FacetValue[]; languages: FacetValue[]; decades: FacetValue[] }; }
export async function facetedSearch(params: Record<string, string>): Promise<FacetedSearch> { const query = new URLSearchParams(params).toString(); return apiFetch(`/search/faceted?${query}`); }

// ─── Circulation ──────────────────────────────────────────────────────────────

export async function checkout(userId: string, itemId?: string, barcode?: string) {
  return apiFetch('/circulation/checkouts', {
    method: 'POST',
    body: JSON.stringify({ userId, itemId, barcode }),
  });
}

export async function returnLoan(loanId: string) {
  return apiFetch(`/circulation/returns/${loanId}`, { method: 'POST' });
}

export async function renewLoan(loanId: string) {
  return apiFetch(`/circulation/renewals/${loanId}`, { method: 'POST' });
}

export async function getUserLoans(userId: string): Promise<Loan[]> {
  return apiFetch(`/circulation/loans/user/${userId}`);
}

export async function getOverdueLoans(): Promise<Loan[]> {
  return apiFetch('/circulation/loans/overdue');
}

// ─── Holds ────────────────────────────────────────────────────────────────────

export async function placeHold(itemId: string) {
  return apiFetch('/holds', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}

export async function createInterest(input: { itemId?: string; requestedTitle?: string; reason: "availability" | "acquisition" }) { return apiFetch("/interests", { method: "POST", body: JSON.stringify(input) }); }
export async function reportItemIssue(itemId: string, input: { copyId: string; type: string; note?: string }) { return apiFetch(`/issues/items/${itemId}`, { method: "POST", body: JSON.stringify(input) }); }
export async function getItemIssues() { return apiFetch("/issues"); }
export async function resolveItemIssue(id: string) { return apiFetch(`/issues/${id}/resolve`, { method: "POST" }); }
export async function previewImport(rows: unknown[]) { return apiFetch("/catalog/import/preview", { method: "POST", body: JSON.stringify({ rows }) }); }
export async function commitImport(rows: unknown[]) { return apiFetch("/catalog/import/commit", { method: "POST", body: JSON.stringify({ rows }) }); }

export async function getUserHolds(userId: string): Promise<Hold[]> {
  return apiFetch(`/holds/user/${userId}`);
}

export async function cancelHold(holdId: string) {
  return apiFetch(`/holds/${holdId}`, { method: 'DELETE' });
}

// ─── Fines ────────────────────────────────────────────────────────────────────

export async function getFineBalance(userId: string): Promise<{ userId: string; balanceCents: number }> {
  return apiFetch(`/fines/users/${userId}/balance`);
}

export async function getFineLedger(userId: string): Promise<FineLedgerEntry[]> {
  return apiFetch(`/fines/users/${userId}/ledger`);
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function search(q: string): Promise<Item[]> {
  return apiFetch(`/search?q=${encodeURIComponent(q)}`);
}

export async function getRecommendations(userId: string): Promise<Item[]> {
  return apiFetch(`/search/recommendations/${userId}`);
}

// ─── Users (admin) ────────────────────────────────────────────────────────────

export async function getUsers(params: Record<string, string> = {}): Promise<User[]> {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/users${query ? `?${query}` : ''}`);
}

export async function updateUserRoles(userId: string, roles: string[]) {
  return apiFetch(`/users/${userId}/roles`, {
    method: "PATCH",
    body: JSON.stringify({ roles }),
  });
}

export interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  readAt?: string;
  createdAt: string;
}

export async function getNotifications(unread = false): Promise<NotificationItem[]> {
  return apiFetch(`/notifications${unread ? "?unread=true" : ""}`);
}

export async function markNotificationRead(id: string) {
  return apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

export interface LoanPolicy {
  _id: string;
  itemType: string;
  memberType: string;
  loanDays: number;
  renewalLimit: number;
  finePerDayCents: number;
  maxActiveLoans: number;
}

export async function getPolicies(): Promise<LoanPolicy[]> {
  return apiFetch("/policies");
}

export async function updatePolicy(id: string, patch: Partial<LoanPolicy>) {
  return apiFetch(`/policies/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export interface AuditEntry {
  _id: string;
  action: string;
  targetType: string;
  actorId?: string;
  createdAt: string;
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  return apiFetch("/audit");
}
