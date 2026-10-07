import { ItemType, MemberType } from "../../types";

export interface LoanPolicyRecord {
  itemType: ItemType;
  memberType: MemberType;
  loanDays: number;
  renewalLimit: number;
  finePerDayCents: number;
  maxActiveLoans: number;
}

export const defaultLoanPolicies: LoanPolicyRecord[] = [
  { itemType: "book", memberType: "student", loanDays: 14, renewalLimit: 2, finePerDayCents: 50, maxActiveLoans: 5 },
  { itemType: "book", memberType: "faculty", loanDays: 30, renewalLimit: 3, finePerDayCents: 25, maxActiveLoans: 12 },
  { itemType: "book", memberType: "guest", loanDays: 7, renewalLimit: 0, finePerDayCents: 100, maxActiveLoans: 2 },
  { itemType: "journal", memberType: "student", loanDays: 7, renewalLimit: 1, finePerDayCents: 100, maxActiveLoans: 3 },
  { itemType: "journal", memberType: "faculty", loanDays: 14, renewalLimit: 1, finePerDayCents: 50, maxActiveLoans: 8 },
  { itemType: "journal", memberType: "guest", loanDays: 3, renewalLimit: 0, finePerDayCents: 150, maxActiveLoans: 1 },
  { itemType: "media", memberType: "student", loanDays: 7, renewalLimit: 1, finePerDayCents: 100, maxActiveLoans: 2 },
  { itemType: "media", memberType: "faculty", loanDays: 14, renewalLimit: 2, finePerDayCents: 50, maxActiveLoans: 4 },
  { itemType: "media", memberType: "guest", loanDays: 3, renewalLimit: 0, finePerDayCents: 150, maxActiveLoans: 1 },
  { itemType: "equipment", memberType: "student", loanDays: 3, renewalLimit: 0, finePerDayCents: 500, maxActiveLoans: 1 },
  { itemType: "equipment", memberType: "faculty", loanDays: 7, renewalLimit: 1, finePerDayCents: 250, maxActiveLoans: 2 },
  { itemType: "equipment", memberType: "guest", loanDays: 1, renewalLimit: 0, finePerDayCents: 750, maxActiveLoans: 1 },
];

export class PolicyEngine {
  constructor(private readonly policies: LoanPolicyRecord[] = defaultLoanPolicies) {}

  resolve(itemType: ItemType, memberType: MemberType) {
    const policy = this.policies.find((entry) => entry.itemType === itemType && entry.memberType === memberType);
    if (!policy) {
      throw new Error(`No loan policy for ${memberType} borrowing ${itemType}`);
    }
    return policy;
  }

  dueDate(checkoutAt: Date, itemType: ItemType, memberType: MemberType) {
    const policy = this.resolve(itemType, memberType);
    const dueAt = new Date(checkoutAt);
    dueAt.setDate(dueAt.getDate() + policy.loanDays);
    return dueAt;
  }

  fineForReturn(dueAt: Date, returnedAt: Date, itemType: ItemType, memberType: MemberType) {
    const lateMs = returnedAt.getTime() - dueAt.getTime();
    if (lateMs <= 0) {
      return 0;
    }
    const lateDays = Math.ceil(lateMs / 86_400_000);
    return lateDays * this.resolve(itemType, memberType).finePerDayCents;
  }
}
