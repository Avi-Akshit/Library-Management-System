import mongoose from "mongoose";
import { domainEvents } from "../../events/eventBus";
import { FineLedgerEntry } from "../../models/FineLedgerEntry";
import { Hold } from "../../models/Hold";
import { Item, ItemDocument } from "../../models/Item";
import { LoanPolicy } from "../../models/LoanPolicy";
import { Loan } from "../../models/Loan";
import { User } from "../../models/User";
import { ApiError } from "../../middleware/errorHandler";
import { ItemType, MemberType } from "../../types";
import { PolicyEngine, defaultLoanPolicies, LoanPolicyRecord } from "./policyEngine";

export class CirculationService {
  constructor(private readonly policies = new PolicyEngine()) {}

  /**
   * Load effective policies from DB, falling back to defaults when not found.
   * Keeps the in-memory PolicyEngine as the computation layer.
   */
  private async buildPolicyEngine(session?: mongoose.ClientSession): Promise<PolicyEngine> {
    const dbPolicies = await LoanPolicy.find({}).session(session ?? null);
    if (!dbPolicies.length) return this.policies;
    const records: LoanPolicyRecord[] = dbPolicies.map((p) => ({
      itemType: p.itemType as ItemType,
      memberType: p.memberType as MemberType,
      loanDays: p.loanDays,
      renewalLimit: p.renewalLimit,
      finePerDayCents: p.finePerDayCents,
      maxActiveLoans: p.maxActiveLoans,
    }));
    // Fill gaps with defaults so we always have a complete policy set
    const filled = [...records];
    for (const def of defaultLoanPolicies) {
      if (!filled.find((r) => r.itemType === def.itemType && r.memberType === def.memberType)) {
        filled.push(def);
      }
    }
    return new PolicyEngine(filled);
  }

  async checkout(input: { userId: string; itemId?: string; barcode?: string; branchId?: string }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(input.userId).session(session);
      if (!user) throw new ApiError(404, "User not found");

      const engine = await this.buildPolicyEngine(session);
      const itemFilter = input.barcode
        ? { "copies.barcode": input.barcode }
        : mongoose.isObjectIdOrHexString(input.itemId)
          ? { _id: input.itemId }
          : null;
      const item = itemFilter ? await Item.findOne(itemFilter).session(session) : null;
      if (!item) throw new ApiError(404, "Item not found");

      const policy = engine.resolve(item.itemType as ItemType, user.memberType as MemberType);
      const activeLoans = await Loan.countDocuments({ userId: user._id, status: "active" }).session(session);
      if (activeLoans >= policy.maxActiveLoans) throw new ApiError(409, "Member has reached active loan limit");

      // Atomic copy claim — prevents concurrent checkouts racing for the last copy.
      // findOneAndUpdate with the "copies.status": "available" condition is itself atomic,
      // so only one concurrent request can win; the other sees no matching document → 409.
      let claimed: (typeof item) | null = null;
      try {
        const claimFilter: mongoose.QueryFilter<ItemDocument> = input.barcode
          ? { _id: item._id, copies: { $elemMatch: { barcode: input.barcode, status: "available" } } }
          : { _id: item._id, "copies.status": "available" };
        claimed = await Item.findOneAndUpdate(
          claimFilter,
          { $set: { "copies.$.status": "checked_out" } },
          { returnDocument: "after", session },
        ) as unknown as typeof item | null;
      } catch (claimErr: unknown) {
        // WiredTiger write conflict (code 112) or TransientTransactionError under concurrent load
        const code = (claimErr as { code?: number })?.code;
        const labels: string[] = (claimErr as { errorLabels?: string[] })?.errorLabels ?? [];
        if (code === 112 || labels.includes("TransientTransactionError")) {
          throw new ApiError(409, "No available copy");
        }
        throw claimErr;
      }
      if (!claimed) throw new ApiError(409, "No available copy");

      const checkoutAt = new Date();
      const dueAt = engine.dueDate(checkoutAt, item.itemType as ItemType, user.memberType as MemberType);

      const claimedCopy = input.barcode
        ? claimed.copies.find((copy) => copy.barcode === input.barcode && copy.status === "checked_out")
        : claimed.copies.find((copy) => copy.status === "checked_out");
      if (!claimedCopy) throw new ApiError(409, "No available copy");

      const [loan] = await Loan.create(
        [{ userId: user._id, itemId: claimed._id, copyId: claimedCopy._id, checkoutAt, dueAt, status: "active" }],
        { session },
      );
      await session.commitTransaction();
      await domainEvents.emit("ItemCheckedOut", { loanId: String(loan._id), userId: String(user._id), itemId: String(claimed._id) });
      return loan;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async returnLoan(input: { loanId: string; actorId?: string; returnedAt?: Date }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const loan = await Loan.findById(input.loanId).session(session);
      if (!loan || loan.status === "returned") throw new ApiError(404, "Active loan not found");

      const [user, item] = await Promise.all([
        User.findById(loan.userId).session(session),
        Item.findById(loan.itemId).session(session),
      ]);
      if (!user || !item) throw new ApiError(404, "Loan references missing user or item");

      const copy = item.copies.find((candidate) => String(candidate._id) === String(loan.copyId));
      if (!copy) throw new ApiError(404, "Loan copy not found");

      const returnedAt = input.returnedAt ?? new Date();
      const engine = await this.buildPolicyEngine(session);
      const fineCents = engine.fineForReturn(
        loan.dueAt,
        returnedAt,
        item.itemType as ItemType,
        user.memberType as MemberType,
      );

      loan.status = "returned";
      loan.returnedAt = returnedAt;

      const nextHold = await Hold.findOne({ itemId: item._id, status: "queued" }).sort({ position: 1 }).session(session);
      if (nextHold) {
        copy.status = "reserved";
        nextHold.status = "ready";
        nextHold.readyAt = returnedAt;
        nextHold.expiresAt = new Date(returnedAt.getTime() + 48 * 60 * 60 * 1000);
        await nextHold.save({ session });
      } else {
        copy.status = "available";
      }

      if (fineCents > 0) {
        await FineLedgerEntry.create(
          [{
            userId: user._id,
            loanId: loan._id,
            type: "fine",
            amountCents: fineCents,
            reason: "Overdue return",
            createdBy: input.actorId,
          }],
          { session },
        );
      }

      await Promise.all([loan.save({ session }), item.save({ session })]);
      await session.commitTransaction();
      await domainEvents.emit("ItemReturned", { loanId: String(loan._id), userId: String(user._id), itemId: String(item._id), fineCents });
      if (nextHold) {
        await domainEvents.emit("HoldReady", { holdId: String(nextHold._id), userId: String(nextHold.userId), itemId: String(item._id) });
      }
      return { loan, fineCents, holdReady: nextHold };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async renewLoan(input: { loanId: string; actorId?: string }) {
    const loan = await Loan.findById(input.loanId);
    if (!loan || loan.status !== "active") throw new ApiError(404, "Active loan not found");

    const [user, item] = await Promise.all([
      User.findById(loan.userId),
      Item.findById(loan.itemId),
    ]);
    if (!user || !item) throw new ApiError(404, "Loan references missing user or item");

    // Block renewal when other patrons are waiting for this item
    const activeHoldCount = await Hold.countDocuments({ itemId: item._id, status: "queued" });
    if (activeHoldCount > 0) {
      throw new ApiError(409, "Renewal blocked: other patrons are waiting for this item");
    }

    // Load policies from DB so test overrides are respected
    const engine = await this.buildPolicyEngine();
    const policy = engine.resolve(item.itemType as ItemType, user.memberType as MemberType);
    if (loan.renewalCount >= policy.renewalLimit) {
      throw new ApiError(409, "Renewal limit reached");
    }

    loan.renewalCount += 1;
    loan.dueAt = engine.dueDate(loan.dueAt, item.itemType as ItemType, user.memberType as MemberType);
    await loan.save();
    return loan;
  }

  async getActiveLoansForUser(userId: string) {
    return Loan.find({ userId, status: { $in: ["active", "overdue"] } }).sort({ dueAt: 1 });
  }

  async getOverdueLoans() {
    const now = new Date();
    return Loan.find({ status: { $in: ["active", "overdue"] }, dueAt: { $lt: now } }).sort({ dueAt: 1 });
  }
}
