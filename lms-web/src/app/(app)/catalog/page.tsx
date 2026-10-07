"use client";
import useSWR from "swr";
import { getCatalog } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { itemTypeLabel } from "@/lib/display";
import { CatalogItemCard } from "@/components/catalog-item-card";

const ITEM_TYPES = ["", "book", "journal", "media", "equipment"] as const;

export default function CatalogPage() {
  const [filter, setFilter] = useState("");
  const { data: items, isLoading } = useSWR(["catalog", filter], () =>
    getCatalog(filter ? { itemType: filter } : {}),
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink">Catalog</h1>
          <p className="mt-1 text-[11px] text-ink-muted">{items?.length ?? 0} records filed in the collection</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ITEM_TYPES.map((f) => (
            <button
              key={f || "all"}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "border-b border-transparent pb-1 text-[11px] text-ink-muted",
                filter === f && "border-[#9C7A2E] text-ink",
              )}
            >
              {f ? itemTypeLabel(f) : "All"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => <Skeleton key={index} className="h-56 w-full rounded-none bg-paper-alt" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items?.map((item) => <CatalogItemCard key={item._id} item={item} />)}
          {!items?.length && <p className="py-12 text-[12px] text-ink-muted">No catalog cards in this section.</p>}
        </div>
      )}
    </div>
  );
}
