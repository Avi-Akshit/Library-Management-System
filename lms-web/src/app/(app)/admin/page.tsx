"use client";
import { useState } from "react";
import useSWR from "swr";
import { commitImport, getDonorReport, getItemIssues, getUsers, previewImport, resolveItemIssue, updateUserRoles, getPolicies, updatePolicy, getAuditLog, User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/display";

const ALL_ROLES = ["member", "librarian", "branch_admin", "super_admin"] as const;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [csv, setCsv] = useState("");
  const [review, setReview] = useState<Array<{ index: number; row: Record<string, unknown>; status: string; duplicate?: { title: string } }> | null>(null);

  const isAdmin = user?.roles.some((r) => ["branch_admin", "super_admin"].includes(r));
  const { data: users, isLoading, mutate } = useSWR(
    isAdmin ? ["/admin/users", search] : null,
    () => getUsers(search ? { q: search } : {}),
  );
  const { data: policies, mutate: mutatePolicies } = useSWR(isAdmin ? "/policies" : null, () => getPolicies());
  const { data: audit } = useSWR(isAdmin ? "/audit" : null, () => getAuditLog());
  const { data: issues, mutate: mutateIssues } = useSWR(isAdmin ? "/issues" : null, () => getItemIssues());
  const { data: donors } = useSWR(isAdmin ? "/catalog/reports/donors" : null, getDonorReport);
  const parseCsv = () => csv.trim().split(/\r?\n/).slice(1).map((line, index) => { const [title, creators = "", isbn = "", barcode = ""] = line.split(",").map((value) => value.trim()); return { title, creators: creators ? creators.split(";") : [], isbn, copies: [{ barcode: barcode || `IMPORT-${Date.now()}-${index}` }] }; }).filter((row) => row.title);

  if (!isAdmin) {
    return (
      <p className="font-serif text-xl text-status-overdue-text">
        Collection administration requires a senior card.
      </p>
    );
  }

  const startEdit = (u: User) => {
    setEditingUser(u.id);
    setPendingRoles([...u.roles]);
  };

  const saveRoles = async (userId: string) => {
    try {
      await updateUserRoles(userId, pendingRoles);
      setEditingUser(null);
      mutate();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const cards = users?.length ?? 0;
  const patrons = users?.filter((u) => u.roles.includes("member")).length ?? 0;
  const staff = users?.filter((u) =>
    u.roles.some((r) => ["librarian", "branch_admin", "super_admin"].includes(r)),
  ).length ?? 0;
  const inactive = users?.filter((u) => !u.isActive).length ?? 0;

  return (
    <div>
      <h1 className="font-serif text-[28px] font-normal leading-tight text-ink">Overview</h1>
      <p className="mt-1 font-sans text-[13px] text-ink-muted">
        Library cards, staff access, and who may borrow
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <section className="border border-paper-line border-t-2 border-t-[#35507A] bg-paper-alt p-5">
          <p className="font-sans text-[13px] text-ink-muted">Cards on file</p>
          {isLoading ? (
            <Skeleton className="mt-3 h-12 w-20" />
          ) : (
            <p className="mt-2 font-serif text-[48px] leading-none text-ink">{cards}</p>
          )}
          <p className="mt-3 max-w-[36ch] font-sans text-[13px] text-ink-muted">
            Issued library cards in this branch register, including staff.
          </p>
        </section>
        <section className="border border-paper-line border-t-2 border-t-[#3E6B4A] bg-paper-alt p-5">
          <p className="font-sans text-[13px] text-ink-muted">Patrons</p>
          <p className="mt-2 font-serif text-[32px] leading-none text-ink">{isLoading ? "—" : patrons}</p>
        </section>
        <section className="flex flex-col justify-between border border-paper-line border-t-2 border-t-[#3E6B4A] bg-paper-alt p-5">
          <div>
            <p className="font-sans text-[13px] text-ink-muted">Staff cards</p>
            <p className="mt-2 font-serif text-[32px] leading-none text-ink">{isLoading ? "—" : staff}</p>
          </div>
          <p className="mt-4 font-sans text-[13px] text-ink-muted">
            {inactive} inactive {inactive === 1 ? "card" : "cards"}
          </p>
        </section>
      </div>

      <section className="mt-9 bg-paper-alt p-0">
        <div className="mb-4 flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-[22px] text-ink">Cardholders</h2>
            <p className="mt-1 font-sans text-[13px] text-ink-muted">
              Search the register and assign desk privileges
            </p>
          </div>
          <Input
            placeholder="Name or email on the card…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Membership</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Card</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-sans">{u.name}</TableCell>
                  <TableCell className="text-ink-muted">{u.email}</TableCell>
                  <TableCell className="text-ink-muted">{u.memberType}</TableCell>
                  <TableCell>
                    {editingUser === u.id ? (
                      <div className="flex flex-wrap gap-1">
                        {ALL_ROLES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              setPendingRoles((prev) =>
                                prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
                              )
                            }
                            className={cn(
                              "rounded-btn border px-2 py-0.5 font-sans text-xs",
                              pendingRoles.includes(r)
                                ? "border-brass bg-brass text-white"
                                : "border-paper-line text-ink-muted",
                            )}
                          >
                            {roleLabel(r)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="font-sans text-[13px] text-ink-muted">
                        {u.roles.map(roleLabel).join(", ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "available" : "overdue"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingUser === u.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => saveRoles(u.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(u)}>
                        Edit privileges
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!users?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-ink-muted">
                    No cards match that search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="mt-8 border border-paper-line bg-paper-alt p-5">
        <h2 className="font-serif text-[20px] text-ink">Loan policies</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Loan days</TableHead>
              <TableHead>Renewals</TableHead>
              <TableHead>Fine/day</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies?.map((p) => (
              <TableRow key={p._id}>
                <TableCell>{p.itemType}</TableCell>
                <TableCell>{p.memberType}</TableCell>
                <TableCell>
                  <Input
                    defaultValue={p.loanDays}
                    type="number"
                    className="w-20"
                    onBlur={async (e) => {
                      const loanDays = Number(e.target.value);
                      if (loanDays && loanDays !== p.loanDays) {
                        await updatePolicy(p._id, { loanDays });
                        mutatePolicies();
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{p.renewalLimit}</TableCell>
                <TableCell>{(p.finePerDayCents / 100).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="mt-8 border border-paper-line bg-paper-alt p-5">
        <h2 className="font-serif text-[20px] text-ink">Donor report</h2>
        <Table><TableHeader><TableRow><TableHead>Donor</TableHead><TableHead>Items</TableHead><TableHead>Titles</TableHead></TableRow></TableHeader><TableBody>{donors?.map((donor: { _id: string; itemCount: number; items: string[] }) => <TableRow key={donor._id}><TableCell>{donor._id}</TableCell><TableCell>{donor.itemCount}</TableCell><TableCell>{donor.items.join(", ")}</TableCell></TableRow>)}{!donors?.length && <TableRow><TableCell colSpan={3}>No donated items recorded.</TableCell></TableRow>}</TableBody></Table>
      </section>

      <section className="mt-8 border border-paper-line bg-paper-alt p-5">
        <h2 className="font-serif text-[20px] text-ink">Bulk catalog import</h2>
        <p className="mt-1 text-[11px] text-ink-muted">Paste CSV rows with `title, creators, isbn, barcode`, then review before committing.</p>
        <textarea value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="title,creators,isbn,barcode" className="mt-4 min-h-28 w-full border border-paper-line bg-paper p-3 text-[11px]" />
        <button className="stamp-button mt-3" onClick={async () => { try { const result = await previewImport(parseCsv()); setReview(result.review); } catch (error) { alert((error as Error).message); } }}>Review import</button>
        {review && <div className="mt-4"><Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Note</TableHead></TableRow></TableHeader><TableBody>{review.map((row) => <TableRow key={row.index}><TableCell>{String(row.row.title)}</TableCell><TableCell><Badge variant={row.status === "new" ? "available" : "overdue"}>{row.status.replace("_", " ")}</Badge></TableCell><TableCell>{row.duplicate ? `Similar: ${row.duplicate.title}` : "Ready to add"}</TableCell></TableRow>)}</TableBody></Table><button className="stamp-button mt-3" onClick={async () => { try { await commitImport(review.filter((row) => row.status === "new").map((row) => row.row)); setReview(null); setCsv(""); } catch (error) { alert((error as Error).message); } }}>Commit new records</button></div>}
      </section>

      <section className="mt-8 border border-paper-line bg-paper-alt p-5">
        <h2 className="font-serif text-[20px] text-ink">Reported item issues</h2>
        <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Note</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{issues?.map((issue: { _id: string; type: string; note?: string }) => <TableRow key={issue._id}><TableCell>{issue.type.replace("_", " ")}</TableCell><TableCell>{issue.note || "No note"}</TableCell><TableCell><Button size="sm" variant="secondary" onClick={async () => { await resolveItemIssue(issue._id); mutateIssues(); }}>Resolve</Button></TableCell></TableRow>)}{!issues?.length && <TableRow><TableCell colSpan={3}>No open issues.</TableCell></TableRow>}</TableBody></Table>
      </section>

      <section className="mt-8 border border-paper-line bg-paper-alt p-5">
        <h2 className="font-serif text-[20px] text-ink">Recent activity</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit?.slice(0, 25).map((row) => (
              <TableRow key={row._id}>
                <TableCell className="text-ink-muted">{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell>{row.targetType}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
