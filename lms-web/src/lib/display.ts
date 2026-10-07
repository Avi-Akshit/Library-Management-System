import type { Item } from "./api";

const TYPE_CODES: Record<string, string> = {
  book: "800",
  journal: "050",
  media: "791",
  equipment: "371.3",
};

const TYPE_LABELS: Record<string, string> = {
  book: "Books",
  journal: "Periodicals",
  media: "Media",
  equipment: "Equipment",
};

export type ShelfStatus = "available" | "reserved" | "overdue" | "on_loan";

export function classificationCode(item: Item): string {
  return TYPE_CODES[item.itemType] ?? "000";
}

export function classificationLabel(item: Item): string {
  return item.subjects?.[0] ?? TYPE_LABELS[item.itemType] ?? item.itemType;
}

export function itemTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function copiesOnShelf(item: Item): number {
  return (item.copies ?? []).filter((c) => c.status === "available").length;
}

export function shelfStatus(item: Item): ShelfStatus {
  const copies = item.copies ?? [];
  if (copies.some((c) => c.status === "available")) return "available";
  if (copies.some((c) => c.status === "reserved")) return "reserved";
  return "on_loan";
}

export function shelfStatusLabel(status: string): string {
  switch (status) {
    case "available":
      return "On shelf";
    case "reserved":
      return "Reserved";
    case "overdue":
      return "Overdue";
    case "checked_out":
    case "on_loan":
    case "active":
      return "On loan";
    case "ready":
      return "Ready for pickup";
    case "queued":
      return "In queue";
    default:
      return status.replace(/_/g, " ");
  }
}

export function badgeVariant(
  status: string,
): "available" | "reserved" | "overdue" | "checked_out" | "default" {
  if (status === "available" || status === "ready") return "available";
  if (status === "reserved" || status === "queued") return "reserved";
  if (status === "overdue") return "overdue";
  if (status === "checked_out" || status === "on_loan" || status === "active") {
    return "checked_out";
  }
  return "default";
}

export function copyStatusLabel(status: string): string {
  switch (status) {
    case "available":
      return "On shelf";
    case "checked_out":
      return "On loan";
    case "reserved":
      return "Reserved";
    case "in_transfer":
      return "In transfer";
    case "lost":
      return "Missing";
    case "maintenance":
      return "In repair";
    default:
      return status.replace(/_/g, " ");
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case "member":
      return "Patron";
    case "librarian":
      return "Librarian";
    case "branch_admin":
      return "Branch admin";
    case "super_admin":
      return "Collection admin";
    default:
      return role.replace(/_/g, " ");
  }
}
