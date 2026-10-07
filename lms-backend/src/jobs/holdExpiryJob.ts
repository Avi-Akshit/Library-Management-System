import { domainEvents } from "../events/eventBus";
import { Hold } from "../models/Hold";
import { Item } from "../models/Item";
import { User } from "../models/User";

const HOLD_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Runs every 15 minutes.
 * - Expires `ready` holds whose expiresAt has passed.
 * - Promotes the next `queued` hold on the same item.
 */
export function startHoldExpiryJob(intervalMs = 15 * 60 * 1000) {
  const run = async () => {
    try {
      const now = new Date();
      const staleReady = await Hold.find({
        status: "ready",
        expiresAt: { $lte: now },
      });

      for (const hold of staleReady) {
        // Retain the request: an unclaimed pickup returns to the back of its queue.
        const lastQueued = await Hold.findOne({ itemId: hold.itemId, status: "queued" }).sort({ position: -1 });
        hold.status = "queued";
        hold.position = (lastQueued?.position ?? 0) + 1;
        hold.readyAt = undefined;
        hold.expiresAt = undefined;
        await hold.save();
        await domainEvents.emit("HoldExpired", {
          holdId: String(hold._id),
          userId: String(hold.userId),
          itemId: String(hold.itemId),
        });

        // Promote next in queue
        const next = await Hold.findOne({
          itemId: hold.itemId,
          status: "queued",
        }).sort({ position: 1 });

        if (next) {
          next.status = "ready";
          next.readyAt = now;
          next.expiresAt = new Date(now.getTime() + HOLD_WINDOW_MS);
          await next.save();
          await domainEvents.emit("HoldReady", {
            holdId: String(next._id),
            userId: String(next.userId),
            itemId: String(next.itemId),
          });
        } else {
          // No queued hold — mark copy available
          const item = await Item.findById(hold.itemId);
          if (item) {
            const copy = item.copies.find((c) => c.status === "reserved");
            if (copy) {
              copy.status = "available";
              await item.save();
            }
          }
        }
      }
    } catch (error) {
      console.error("[holdExpiryJob] error:", error);
    }
  };

  void run();
  const handle = setInterval(() => void run(), intervalMs);
  return () => clearInterval(handle);
}
