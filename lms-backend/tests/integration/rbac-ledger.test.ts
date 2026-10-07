import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../src/app";
import { setupTestDb, teardownTestDb, seedTestData } from "./helpers";
import { FineService } from "../../src/modules/fines/fineService";

describe("integration: rbac and fine ledger", () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it("rejects a member token on librarian checkout", async () => {
    const app = createApp();
    const { member, book } = await seedTestData();

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "member@test.com", password: "password123" });
    const token = login.body.accessToken;

    const checkout = await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: String(member._id), itemId: String(book._id) });
    assert.equal(checkout.status, 403);
  });

  it("derives fine balance from append-only ledger entries", async () => {
    const { member, librarian } = await seedTestData();
    const fines = new FineService();
    await fines.recordPayment({ userId: String(member._id), amountCents: 0 });
    const FineLedgerEntry = (await import("../../src/models/FineLedgerEntry")).FineLedgerEntry;
    await FineLedgerEntry.create([
      { userId: member._id, type: "fine", amountCents: 500, reason: "Overdue", createdBy: librarian._id },
      { userId: member._id, type: "payment", amountCents: -200, reason: "Partial payment", createdBy: librarian._id },
      { userId: member._id, type: "waiver", amountCents: -100, reason: "Goodwill", createdBy: librarian._id },
    ]);
    const balance = await fines.balanceForUser(String(member._id));
    assert.equal(balance, 200);
  });
});
