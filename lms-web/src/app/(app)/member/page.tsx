"use client";
import useSWR from "swr";
import { getUserLoans, getUserHolds, getFineBalance, renewLoan, cancelHold, getRecommendations, changePassword } from "@/lib/api";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
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
import { badgeVariant, shelfStatusLabel } from "@/lib/display";

export default function MemberDashboard() {
  const { user, logout } = useAuth();
  const userId = user?.id ?? "";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const { data: loans, mutate: mutateLoans, isLoading: loansLoading } = useSWR(
    userId ? `/loans/${userId}` : null,
    () => getUserLoans(userId),
  );
  const { data: holds, mutate: mutateHolds, isLoading: holdsLoading } = useSWR(
    userId ? `/holds/${userId}` : null,
    () => getUserHolds(userId),
  );
  const { data: recs } = useSWR(userId ? `/recs/${userId}` : null, () => getRecommendations(userId));
  const { data: fines, isLoading: finesLoading } = useSWR(userId ? `/fines/${userId}` : null, () =>
    getFineBalance(userId),
  );

  const balance = (fines?.balanceCents ?? 0) / 100;
  const activeCount = loans?.length ?? 0;
  const overdueCount = loans?.filter((l) => l.status === "overdue").length ?? 0;

  return (
    <div>
      <h1 className="font-serif text-[28px] font-normal leading-tight text-ink">My Card</h1>
      <p className="mt-1 font-sans text-[13px] text-ink-muted">
        {user?.name} · {activeCount} {activeCount === 1 ? "title" : "titles"} on loan
        {overdueCount ? ` · ${overdueCount} overdue` : ""}
      </p>

      <section className="mt-7 flex flex-col gap-4 border border-paper-line bg-paper-alt p-5 sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stacks font-serif text-[16px] text-stacks-text">
          {user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "MC"}
        </span>
        <div><p className="font-serif text-[18px]">{user?.name}</p><p className="mt-1 text-[11px] text-ink-muted">card no. {userId.slice(-8) || "pending"} - Main Branch</p></div>
        <div className="sm:ml-auto sm:text-right"><p className={`font-serif text-[20px] ${balance > 0 ? "text-status-overdue-text" : "text-ink"}`}>${balance.toFixed(2)}</p><p className="text-[10px] text-ink-muted">outstanding balance</p></div>
      </section>

      <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section className="bg-paper-alt p-6">
          <h2 className="font-serif text-[22px] text-ink">Active loans</h2>
          <p className="mt-1 font-sans text-[13px] text-ink-muted">
            Titles issued to this card, with due dates
          </p>
          <div className="mt-4">
            {loansLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Renewals</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans?.map((loan) => (
                    <TableRow key={loan._id}>
                      <TableCell className="font-sans text-xs text-ink-muted">
                        {String(loan.itemId).slice(-8)}
                      </TableCell>
                      <TableCell>{new Date(loan.dueAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(loan.status)}>
                          {shelfStatusLabel(loan.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-ink-muted">{loan.renewalCount}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              await renewLoan(loan._id);
                              mutateLoans();
                            } catch (e) {
                              alert((e as Error).message);
                            }
                          }}
                        >
                          Renew
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loans?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-ink-muted">
                        Nothing currently on loan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        <aside className="flex flex-col border-l border-paper-line pl-6">
          <h2 className="font-serif text-[22px] text-ink">Fines owing</h2>
          <p className="mt-1 font-sans text-[13px] text-ink-muted">Balance on this card</p>
          {finesLoading ? (
            <Skeleton className="mt-6 h-10 w-24" />
          ) : (
            <p
              className={`mt-6 font-serif text-[40px] leading-none ${
                balance > 0 ? "text-status-overdue-text" : "text-ink"
              }`}
            >
              ${balance.toFixed(2)}
            </p>
          )}
          <p className="mt-3 font-sans text-[13px] text-ink-muted">
            {balance > 0
              ? "Settle at the circulation desk before borrowing further."
              : "No outstanding charges."}
          </p>
          {!!recs?.length && (
            <div className="mt-8 border-t border-paper-line pt-4">
              <h3 className="text-sm font-medium text-ink">Because you borrowed</h3>
              <ul className="mt-2 space-y-1">
                {recs.slice(0, 5).map((item) => (
                  <li key={item._id} className="text-xs text-ink-muted">
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <section className="mt-8 bg-paper-alt p-6">
        <h2 className="font-serif text-[22px] text-ink">Holds</h2>
        <p className="mt-1 font-sans text-[13px] text-ink-muted">
          Titles waiting on the hold shelf or still in queue
        </p>
        <div className="mt-4">
          {holdsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Queue position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {holds?.map((hold) => (
                  <TableRow key={hold._id}>
                    <TableCell className="font-sans text-xs text-ink-muted">
                      {String(hold.itemId).slice(-8)}
                    </TableCell>
                    <TableCell>#{hold.position}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(hold.status)}>
                        {shelfStatusLabel(hold.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await cancelHold(hold._id);
                            mutateHolds();
                          } catch (e) {
                            alert((e as Error).message);
                          }
                        }}
                      >
                        Cancel hold
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!holds?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-ink-muted">
                      No holds on this card.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="mt-8 max-w-xl border border-paper-line bg-paper-alt p-6">
        <h2 className="font-serif text-[22px] text-ink">Password</h2>
        <p className="mt-1 text-[13px] text-ink-muted">Updating it signs this card out and revokes saved sessions.</p>
        <form className="mt-4 grid gap-3" onSubmit={async (event) => { event.preventDefault(); setPasswordMessage(""); try { await changePassword(currentPassword, newPassword); logout(); } catch (error) { setPasswordMessage((error as Error).message); } }}>
          <input type="password" className="underline-input" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" required autoComplete="current-password" />
          <input type="password" className="underline-input" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password (12+ characters)" minLength={12} required autoComplete="new-password" />
          <button className="stamp-button w-fit">Update password</button>
          {passwordMessage && <p className="text-sm text-ink-muted">{passwordMessage}</p>}
        </form>
      </section>
    </div>
  );
}
