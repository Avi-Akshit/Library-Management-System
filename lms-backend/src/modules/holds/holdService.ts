import { domainEvents } from "../../events/eventBus";
import { Branch } from "../../models/Branch";
import { Hold } from "../../models/Hold";
import { Item } from "../../models/Item";
import { ApiError } from "../../middleware/errorHandler";

export class HoldService {
  async getDefaultBranchId() {
    const branch = await Branch.findOne().sort({ createdAt: 1 });
    if (!branch) throw new ApiError(500, "No library branch configured");
    return String(branch._id);
  }

  async placeHold(input: { userId: string; itemId: string; pickupBranchId?: string }) {
    const item = await Item.findById(input.itemId);
    if (!item) throw new ApiError(404, "Item not found");

    const pickupBranchId = input.pickupBranchId ?? (await this.getDefaultBranchId());

    const activeCount = await Hold.countDocuments({
      itemId: item._id,
      status: { $in: ["queued", "ready"] },
    });

    const hold = await Hold.create({
      itemId: item._id,
      userId: input.userId,
      pickupBranchId,
      position: activeCount + 1,
      status: "queued",
    });

    await domainEvents.emit("HoldPlaced", {
      holdId: String(hold._id),
      userId: input.userId,
      itemId: String(item._id),
    });
    return hold;
  }

  async cancelHold(input: { holdId: string; userId: string; isStaff: boolean }) {
    const hold = await Hold.findById(input.holdId);
    if (!hold) throw new ApiError(404, "Hold not found");
    if (!input.isStaff && String(hold.userId) !== input.userId) {
      throw new ApiError(403, "Cannot cancel another member's hold");
    }
    if (!["queued", "ready"].includes(hold.status)) {
      throw new ApiError(409, "Hold cannot be cancelled");
    }

    hold.status = "cancelled";
    await hold.save();
    return hold;
  }

  async expireReadyHolds(now = new Date()) {
    const expired = await Hold.find({ status: "ready", expiresAt: { $lte: now } });
    await Promise.all(
      expired.map(async (hold) => {
        const lastQueued = await Hold.findOne({ itemId: hold.itemId, status: "queued" }).sort({ position: -1 });
        hold.status = "queued";
        hold.position = (lastQueued?.position ?? 0) + 1;
        hold.readyAt = undefined;
        hold.expiresAt = undefined;
        await hold.save();
        const next = await Hold.findOne({ itemId: hold.itemId, status: "queued", _id: { $ne: hold._id } }).sort({ position: 1 });
        if (next) {
          next.status = "ready";
          next.readyAt = now;
          next.expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
          await next.save();
          await domainEvents.emit("HoldReady", { holdId: String(next._id), userId: String(next.userId), itemId: String(next.itemId) });
        }
        await domainEvents.emit("HoldExpired", {
          holdId: String(hold._id),
          userId: String(hold.userId),
          itemId: String(hold.itemId),
        });
      }),
    );
    return expired.length;
  }
}
