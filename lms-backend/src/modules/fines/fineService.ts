import mongoose from "mongoose";
import { FineLedgerEntry } from "../../models/FineLedgerEntry";

export class FineService {
  async balanceForUser(userId: string) {
    const matchId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const rows = await FineLedgerEntry.aggregate<{ balanceCents: number }>([
      { $match: { userId: matchId } },
      { $group: { _id: "$userId", balanceCents: { $sum: "$amountCents" } } },
    ]);
    return rows[0]?.balanceCents ?? 0;
  }

  async recordPayment(input: { userId: string; amountCents: number; actorId?: string }) {
    return FineLedgerEntry.create({
      userId: input.userId,
      type: "payment",
      amountCents: -Math.abs(input.amountCents),
      reason: "Member payment",
      createdBy: input.actorId,
    });
  }

  async waiveFine(input: { userId: string; amountCents: number; reason: string; actorId?: string }) {
    return FineLedgerEntry.create({
      userId: input.userId,
      type: "waiver",
      amountCents: -Math.abs(input.amountCents),
      reason: input.reason,
      createdBy: input.actorId,
    });
  }
}
