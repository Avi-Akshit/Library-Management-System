import { domainEvents } from "../events/eventBus";
import { Loan } from "../models/Loan";

/**
 * startOverdueJob — runs every 60 minutes.
 * Finds active loans past their due date and marks them overdue,
 * then emits an OverdueEscalation event per affected user.
 */
export function startOverdueJob(intervalMs = 60 * 60 * 1000) {
  const run = async () => {
    try {
      const now = new Date();
      const result = await Loan.updateMany(
        { status: "active", dueAt: { $lt: now } },
        { $set: { status: "overdue" } },
      );

      if (result.modifiedCount > 0) {
        // Emit escalation events for newly overdue loans so notification listeners fire
        const overdueLoans = await Loan.find({
          status: "overdue",
          dueAt: { $lt: now },
        }).select("_id userId itemId dueAt");

        for (const loan of overdueLoans) {
          await domainEvents.emit("OverdueEscalation", {
            loanId: String(loan._id),
            userId: String(loan.userId),
            itemId: String(loan.itemId),
            dueAt: loan.dueAt.toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("[overdueJob] error:", error);
    }
  };

  void run();
  const handle = setInterval(() => void run(), intervalMs);
  return () => clearInterval(handle);
}

/**
 * startDueDateReminderJob — runs every 60 minutes.
 * Emits DueDateApproaching for loans due within the next 24 hours that
 * haven't been reminded yet (uses a simple window: dueAt in [now, now+24h]).
 */
export function startDueDateReminderJob(intervalMs = 60 * 60 * 1000) {
  const run = async () => {
    try {
      const now = new Date();
      const window24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const upcoming = await Loan.find({
        status: "active",
        dueAt: { $gte: now, $lte: window24h },
      }).select("_id userId itemId dueAt");

      for (const loan of upcoming) {
        await domainEvents.emit("DueDateApproaching", {
          loanId: String(loan._id),
          userId: String(loan.userId),
          itemId: String(loan.itemId),
          dueAt: loan.dueAt.toISOString(),
        });
      }
    } catch (error) {
      console.error("[dueDateReminderJob] error:", error);
    }
  };

  void run();
  const handle = setInterval(() => void run(), intervalMs);
  return () => clearInterval(handle);
}
