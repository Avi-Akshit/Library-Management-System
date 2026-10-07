"use client";
import { useState } from "react";
import useSWR from "swr";
import { checkout, returnLoan, getOverdueLoans } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STAFF_ROLES = ["librarian", "branch_admin", "super_admin"];

export default function LibrarianDashboard() {
  const { user } = useAuth();
  const [checkoutUserId, setCheckoutUserId] = useState("");
  const [checkoutItemId, setCheckoutItemId] = useState("");
  const [returnLoanId, setReturnLoanId] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const isStaff = user?.roles.some((r) => STAFF_ROLES.includes(r));
  const { data: overdue, isLoading, mutate } = useSWR(isStaff ? "/overdue-loans" : null, () =>
    getOverdueLoans(),
  );

  if (!isStaff) {
    return (
      <p className="font-serif text-xl text-status-overdue-text">
        This desk is for library staff only.
      </p>
    );
  }

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const overdueCount = overdue?.length ?? 0;

  return (
    <div>
      <h1 className="font-serif text-[28px] font-normal leading-tight text-ink">Circulation desk</h1>
      <p className="mt-1 font-sans text-[13px] text-ink-muted">
        Today&apos;s queue · {isLoading ? "counting overdue loans…" : `${overdueCount} overdue`}
      </p>

      {msg && (
        <p
          className={`mt-4 font-sans text-sm ${msg.ok ? "text-status-available-text" : "text-status-overdue-text"}`}
        >
          {msg.text}
        </p>
      )}

      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <section className="border border-paper-line bg-paper-alt p-6">
            <label className="block text-[10px] text-ink-muted">Scan or enter barcode</label>
            <Input data-testid="checkout-barcode" className="mt-2 text-base" placeholder="_" value={checkoutItemId} onChange={(event) => setCheckoutItemId(event.target.value)} />
          </section>
          <section className="mt-5 border border-paper-line bg-paper-alt p-5">
            <h2 className="font-serif text-[18px] text-ink">Current transaction</h2>
            <p className="mt-2 text-[12px] text-ink-muted">Patron card: {checkoutUserId || "scan a member card"}</p>
            <p className="mt-1 text-[12px] text-ink-muted">Item barcode: {checkoutItemId || "waiting for scan"}</p>
            <div className="mt-5 flex gap-3">
              <button data-testid="checkout-submit" className="stamp-button flex-1" onClick={async () => {
                if (!checkoutUserId || !checkoutItemId) return;
                try { await checkout(checkoutUserId, undefined, checkoutItemId); flash("Issued on loan."); setCheckoutItemId(""); mutate(); } catch (e) { flash((e as Error).message, false); }
              }}>Check out</button>
              <button data-testid="return-submit" className="stamp-button stamp-button--return flex-1" onClick={async () => {
                if (!returnLoanId) return;
                try { const result = await returnLoan(returnLoanId); const fine = (result as { fineCents?: number })?.fineCents ?? 0; flash(fine ? `Returned. Fine assessed: $${(fine / 100).toFixed(2)}.` : "Returned to shelf."); setReturnLoanId(""); mutate(); } catch (e) { flash((e as Error).message, false); }
              }}>Return</button>
            </div>
          </section>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div><label className="text-[10px] text-ink-muted">Member card ID</label><Input data-testid="checkout-user-id" value={checkoutUserId} onChange={(event) => setCheckoutUserId(event.target.value)} placeholder="Patron ID" /></div>
            <div><label className="text-[10px] text-ink-muted">Loan ID for return</label><Input data-testid="return-loan-id" value={returnLoanId} onChange={(event) => setReturnLoanId(event.target.value)} placeholder="Loan ID" /></div>
          </div>
        </div>
        <aside className="border border-paper-line bg-paper-alt p-4 text-[11px]">
          <p className="border-b border-dashed border-paper-line pb-3 text-[10px] text-ink-muted">TODAY - CIRCULATION DESK</p>
          <p className="border-b border-dashed border-paper-line py-3">{isLoading ? "Counting transactions..." : `${overdueCount} overdue loans`}</p>
          <p className="border-b border-dashed border-paper-line py-3 text-ink-muted">Live transaction receipt</p>
        </aside>
      </div>

      <section className="mt-10 bg-paper-alt">
        <div className="px-5 pt-5"><h2 className="font-serif text-[20px] text-ink">Overdue items</h2><p className="mt-1 text-[11px] text-ink-muted">Loans that require desk attention</p></div>
        <div className="mt-3">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue?.map((loan) => (
                  <TableRow key={loan._id}>
                    <TableCell className="font-sans text-xs text-ink-muted">
                      {loan._id.slice(-8)}
                    </TableCell>
                    <TableCell className="font-sans text-xs text-ink-muted">
                      {String(loan.itemId).slice(-8)}
                    </TableCell>
                    <TableCell>{new Date(loan.dueAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="overdue">Overdue</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!overdue?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-ink-muted">
                      No overdue loans on the desk today.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
