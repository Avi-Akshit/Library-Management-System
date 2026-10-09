import Link from "next/link";
import { Item } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  badgeVariant,
  classificationCode,
  classificationLabel,
  copiesOnShelf,
  itemTypeLabel,
  shelfStatus,
  shelfStatusLabel,
} from "@/lib/display";

export function CatalogItemCard({ item }: { item: Item }) {
  const status = shelfStatus(item);
  const onShelf = copiesOnShelf(item);
  const total = item.copies?.length ?? 0;

  return (
    <Link href={`/catalog/item?id=${item._id}`} className="block h-full">
      <article className="ruled-paper relative flex h-full min-h-[228px] flex-col border border-paper-line p-5 transition-colors hover:border-ink-muted">
        <Badge variant={badgeVariant(status)} className="absolute right-4 top-4 rotate-[3deg]">
          {shelfStatusLabel(status)}
        </Badge>
        <p className="mt-1 font-sans italic text-[11px] text-ink-muted">
          {classificationCode(item)} — {classificationLabel(item)}
        </p>
        <h3 className="mt-1 font-serif text-[18px] leading-snug text-ink line-clamp-2">
          {item.title}
        </h3>
        <p className="mt-1 font-sans text-[12px] text-ink-muted line-clamp-1">
          {item.creators?.join(", ") || "Unknown creator"}
        </p>
        <div className="mt-auto border-t border-paper-line pt-3 mt-4 flex items-center justify-between gap-3 font-sans text-[12px] text-ink-muted">
          <span>
            {onShelf} of {total} {total === 1 ? "copy" : "copies"} on shelf
          </span>
          <span>{itemTypeLabel(item.itemType)}</span>
        </div>
      </article>
    </Link>
  );
}
