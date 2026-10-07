export const roles = ["member", "librarian", "branch_admin", "super_admin"] as const;
export type Role = (typeof roles)[number];

export const memberTypes = ["student", "faculty", "guest"] as const;
export type MemberType = (typeof memberTypes)[number];

export const itemTypes = ["book", "journal", "media", "equipment"] as const;
export type ItemType = (typeof itemTypes)[number];

export type DomainEventName =
  | "ItemCheckedOut"
  | "ItemReturned"
  | "FineAccrued"
  | "HoldPlaced"
  | "HoldReady"
  | "HoldExpired"
  | "LoanOverdue"
  | "DueDateApproaching"
  | "OverdueEscalation";

export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  name: DomainEventName;
  payload: TPayload;
  occurredAt: Date;
}
