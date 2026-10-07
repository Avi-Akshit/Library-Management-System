export const roles = ["member", "librarian", "branch_admin", "super_admin"] as const;
export type Role = (typeof roles)[number];

export const memberTypes = ["student", "faculty", "guest"] as const;
export type MemberType = (typeof memberTypes)[number];

export const itemTypes = ["book", "journal", "media", "equipment"] as const;
export type ItemType = (typeof itemTypes)[number];
