"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic } from "lucide-react";
import useSWR from "swr";
import { facetedSearch, FacetValue } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { CatalogItemCard } from "@/components/catalog-item-card";
import { Skeleton } from "@/components/ui/skeleton";

type FacetKey = "genre" | "subcategory" | "format" | "language" | "decade";
const groups: Array<{ key: FacetKey; label: string; response: "genres" | "subcategories" | "formats" | "languages" | "decades" }> = [
  { key: "genre", label: "Genre", response: "genres" }, { key: "subcategory", label: "Sub-category", response: "subcategories" }, { key: "format", label: "Format", response: "formats" }, { key: "language", label: "Language", response: "languages" }, { key: "decade", label: "Publication decade", response: "decades" },
];

export default function SearchPage() {
  const [q, setQ] = useState(""); const [submitted, setSubmitted] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [selected, setSelected] = useState<Record<FacetKey, string[]>>({ genre: [], subcategory: [], format: [], language: [], decade: [] });
  const params = useMemo(() => Object.fromEntries([["q", submitted], ...Object.entries(selected).filter(([, values]) => values.length).map(([key, values]) => [key, values.join(",")])]), [submitted, selected]);
  const { data, isLoading } = useSWR(["faceted-search", params], () => facetedSearch(params));
  const toggle = (key: FacetKey, value: string) => setSelected((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((entry) => entry !== value) : [...current[key], value] }));
  useEffect(() => setVoiceSupported(Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)), []);
  const listen = () => { const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; const recognition = new Recognition(); recognition.onresult = (event: any) => { const transcript = event.results[0][0].transcript; setQ(transcript); setSubmitted(transcript); }; recognition.start(); };

  return <div>
    <h1 className="font-serif text-[28px] font-normal text-ink">Search the catalog</h1>
    <form onSubmit={(event) => { event.preventDefault(); setSubmitted(q.trim()); }} className="mt-6 flex max-w-2xl gap-2"><Input data-testid="search-input" className="text-base" placeholder="Search titles, authors, and subjects" value={q} onChange={(event) => setQ(event.target.value)} />{voiceSupported && <button type="button" onClick={listen} title="Voice search" className="border border-paper-line px-3 text-[#35507A]"><Mic size={16} /></button>}</form>
    <div className="mt-7 grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="border-r border-paper-line pr-5">
        {groups.map(({ key, label, response }) => <section key={key} className="mb-6"><h2 className="mb-2 text-[10px] text-ink-muted">{label}</h2>{(data?.facets[response] ?? []).map((facet: FacetValue) => <button key={facet.value} type="button" onClick={() => toggle(key, facet.value)} className="flex w-full items-center gap-2 py-1 text-left text-[11px]"><span className={`h-3 w-3 border border-ink ${selected[key].includes(facet.value) ? "bg-ink" : "bg-transparent"}`} /><span>{facet.value}</span><span className="ml-auto text-ink-muted">{facet.count}</span></button>)}</section>)}
      </aside>
      <section>
        <p className="mb-4 text-[11px] text-ink-muted">{data?.items.length ?? 0} records filed</p>
        {isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((number) => <Skeleton key={number} className="h-56 rounded-none" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data?.items.map((item) => <CatalogItemCard key={item._id} item={item} />)}{!data?.items.length && <p className="text-[12px] text-ink-muted">No records match these filters.</p>}</div>}
      </section>
    </div>
  </div>;
}
