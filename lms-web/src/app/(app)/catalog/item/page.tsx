"use client";

import Link from "next/link";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { createInterest, getCatalog, getEditions, getItem, checkout, placeHold, reportItemIssue } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogItemCard } from "@/components/catalog-item-card";
import { badgeVariant, classificationCode, classificationLabel, copiesOnShelf, itemTypeLabel, shelfStatus, shelfStatusLabel } from "@/lib/display";

const STAFF_ROLES = ["librarian", "branch_admin", "super_admin"];

export default function ItemDetail() {
  const [id, setId] = useState("");
  const { user } = useAuth();
  const { data: item, mutate, isLoading } = useSWR(id ? `/catalog/${id}` : null, () => getItem(id));
  const { data: editionData } = useSWR(id ? `/catalog/${id}/editions` : null, () => getEditions(id));
  const { data: catalog } = useSWR("catalog-related", () => getCatalog());
  const [checkoutUserId, setCheckoutUserId] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [issueType, setIssueType] = useState("damaged");
  const [issueNote, setIssueNote] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const isStaff = user?.roles.some((role) => STAFF_ROLES.includes(role));

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get("id") ?? "");
  }, []);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    window.setTimeout(() => setMsg(null), 3500);
  };

  if (!id) return <p className="text-[12px] text-ink-muted">No catalog record was selected.</p>;
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-72 w-full" /></div>;
  if (!item) return <p className="text-[12px] text-ink-muted">This record is not filed in the catalog.</p>;

  const availability = shelfStatus(item);
  const onShelf = copiesOnShelf(item);
  const related = catalog
    ?.filter((entry) => entry._id !== item._id && entry.subjects?.some((subject) => item.subjects?.includes(subject)))
    .slice(0, 3) ?? [];

  return (
    <div className="max-w-6xl">
      <Link href="/catalog" className="border-b border-paper-line pb-1 text-[11px] text-ink-muted hover:text-ink">Back to catalog</Link>
      {msg && <p className={`mt-5 text-[12px] ${msg.ok ? "text-status-available-text" : "text-status-overdue-text"}`}>{msg.text}</p>}
      {(editionData?.editions.length ?? 0) > 1 && <div className="mt-5 flex flex-wrap border-b border-paper-line">{editionData!.editions.map((edition) => <Link key={edition._id} href={`/catalog/item?id=${edition._id}`} className={`border border-b-0 px-4 py-2 text-[11px] ${edition._id === item._id ? "bg-[#35507A] text-paper" : "text-ink-muted"}`}>{edition.format || itemTypeLabel(edition.itemType)}</Link>)}</div>}
      <div className="mt-8 grid gap-8 md:grid-cols-[190px_minmax(0,1fr)]">
        <div className="flex h-[280px] items-end bg-[#35507A] p-4 shadow-[4px_4px_0_rgba(28,27,25,0.12)]">
          <span className="font-serif text-[16px] text-paper [writing-mode:vertical-rl]">{item.creators?.[0] || "Catalog record"}</span>
        </div>
        <div>
          <p className="font-sans italic text-[11px] text-ink-muted">{classificationCode(item)} - {classificationLabel(item)}</p>
          <h1 className="mt-1 font-serif text-[32px] font-normal leading-tight text-ink">{item.title}</h1>
          <p className="mt-2 text-[13px] text-ink-muted">{item.creators?.join(", ") || "Creator not recorded"}</p>
          {item.donatedBy && <p className="mt-2 text-[11px] text-ink-muted">Donated by {item.donatedBy}</p>}
          <div className="mt-6 flex flex-wrap gap-x-7 gap-y-4 border-y border-paper-line py-4 text-[11px]">
            <div><p className="text-ink-muted">Call no.</p><p>{classificationCode(item)}</p></div>
            <div><p className="text-ink-muted">Format</p><p>{itemTypeLabel(item.itemType)}</p></div>
            <div><p className="text-ink-muted">Availability</p><p>{onShelf} of {item.copies?.length ?? 0} on shelf</p></div>
            <Badge variant={badgeVariant(availability)} className="self-end rotate-[2deg]">{shelfStatusLabel(availability)}</Badge>
          </div>
          {item.description && <p className="mt-6 max-w-[62ch] text-[13px] leading-7 text-ink">{item.description}</p>}
          <div className="mt-7">
            {isStaff ? (
              <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1"><label className="text-[10px] text-ink-muted">Patron library-card ID</label><Input value={checkoutUserId} onChange={(event) => setCheckoutUserId(event.target.value)} placeholder="Card ID" /></div>
                <button className="stamp-button" onClick={async () => { if (!checkoutUserId) return; try { await checkout(checkoutUserId, id); flash("Item issued on loan."); setCheckoutUserId(""); mutate(); } catch (error) { flash((error as Error).message, false); } }}>Check out</button>
              </div>
            ) : <div className="flex flex-wrap gap-3"><button data-testid="place-hold" className="stamp-button" onClick={async () => { try { await placeHold(id); flash("Hold placed. The desk will notify you when it is ready."); } catch (error) { flash((error as Error).message, false); } }}>Place a hold</button><button className="border border-dashed border-[#35507A] px-4 text-[11px] text-[#35507A]" onClick={async () => { try { await createInterest({ itemId: id, reason: "availability" }); flash("We will notify you when availability changes."); } catch (error) { flash((error as Error).message, false); } }}>Notify me</button></div>}
          </div>
        </div>
      </div>
      <section className="mt-8 border-t border-paper-line pt-5"><button type="button" className="text-[11px] text-[#35507A]" onClick={() => setShowIssue((value) => !value)}>Report an issue</button>{showIssue && <form className="mt-3 max-w-md space-y-3" onSubmit={async (event) => { event.preventDefault(); const copy = item.copies?.[0]; if (!copy) return flash("No copy is available to report.", false); try { await reportItemIssue(id, { copyId: copy._id, type: issueType, note: issueNote }); setShowIssue(false); setIssueNote(""); flash("Thanks - we'll take a look."); } catch (error) { flash((error as Error).message, false); } }}><select value={issueType} onChange={(event) => setIssueType(event.target.value)} className="border border-paper-line bg-paper-alt px-2 py-2 text-[11px]"><option value="damaged">Damaged</option><option value="missing_pages">Missing pages</option><option value="wrong_information">Wrong information</option><option value="other">Other</option></select><textarea value={issueNote} onChange={(event) => setIssueNote(event.target.value)} placeholder="Optional note" className="block w-full border border-paper-line bg-paper-alt p-2 text-[11px]" /><button className="stamp-button" type="submit">Send report</button></form>}</section>
      <section className="mt-12">
        <p className="mb-3 text-[11px] text-ink-muted">Also filed under {classificationLabel(item)}</p>
        <div className="grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {related.map((relatedItem) => <CatalogItemCard key={relatedItem._id} item={relatedItem} />)}
          {!related.length && <p className="text-[12px] text-ink-muted">No related subject cards are recorded for this title.</p>}
        </div>
      </section>
    </div>
  );
}
