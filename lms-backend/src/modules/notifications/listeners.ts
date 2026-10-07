import { domainEvents } from "../../events/eventBus";
import { Notification } from "../../models/Notification";
import { User } from "../../models/User";
import { sendEmail } from "./emailProvider";

async function notifyUser(input: {
  userId: string;
  type: "due_reminder" | "hold_ready" | "overdue" | "fine" | "system";
  title: string;
  body: string;
}) {
  const notification = await Notification.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    delivery: { email: "pending", inApp: "created" },
  });

  const user = await User.findById(input.userId);
  if (user?.email) {
    const result = await sendEmail({ to: user.email, subject: input.title, body: input.body });
    if (notification.delivery) {
      notification.delivery.email = result.sent ? "sent" : "skipped";
      await notification.save();
    }
  }

  return notification;
}

export function registerNotificationListeners() {
  domainEvents.on("HoldReady", async (event) => {
    await notifyUser({
      userId: String(event.payload.userId),
      type: "hold_ready",
      title: "Your hold is ready",
      body: "A requested item is ready for pickup and will be held for 48 hours.",
    });
  });

  domainEvents.on("HoldExpired", async (event) => {
    await notifyUser({
      userId: String(event.payload.userId),
      type: "system",
      title: "Hold expired",
      body: "Your hold window has expired. You may rejoin the waitlist if needed.",
    });
  });

  domainEvents.on("ItemReturned", async (event) => {
    const fineCents = Number(event.payload.fineCents ?? 0);
    if (fineCents > 0 && event.payload.loanId) {
      await notifyUser({
        userId: String(event.payload.userId),
        type: "fine",
        title: "Fine posted",
        body: `A fine of ${fineCents} cents was posted for an overdue return.`,
      });
    }
  });

  domainEvents.on("DueDateApproaching", async (event) => {
    await notifyUser({
      userId: String(event.payload.userId),
      type: "due_reminder",
      title: "Loan due soon",
      body: "One of your loans is due within the next 24 hours.",
    });
  });

  domainEvents.on("OverdueEscalation", async (event) => {
    await notifyUser({
      userId: String(event.payload.userId),
      type: "overdue",
      title: "Loan overdue",
      body: "One of your loans is now overdue. Please return it as soon as possible.",
    });
  });
}
