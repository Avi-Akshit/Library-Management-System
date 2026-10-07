import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../src/app";
import { setupTestDb, teardownTestDb, seedTestData } from "./helpers";
import { LoanPolicy } from "../../src/models/LoanPolicy";

describe("integration: policies and search", () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it("renewal limit is enforced", async () => {
    const app = createApp();
    const { member, librarian, book } = await seedTestData();

    await LoanPolicy.findOneAndUpdate(
      { itemType: "book", memberType: "student" },
      { renewalLimit: 0 },
    );

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "librarian@test.com", password: "password123" });
    const token = login.body.accessToken;

    const checkout = await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: String(member._id), itemId: String(book._id) });
    assert.equal(checkout.status, 201, `checkout failed: ${JSON.stringify(checkout.body)}`);
    const loanId = checkout.body._id;

    const renew = await request(app)
      .post(`/circulation/renewals/${loanId}`)
      .set("Authorization", `Bearer ${token}`);
    assert.equal(renew.status, 409);
  });

  it("hybrid search returns matching title", async () => {
    const app = createApp();
    await seedTestData();

    const res = await request(app).get("/catalog/search?q=Alpha");
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 1);
    assert.ok(res.body[0].item.title.includes("Alpha"));
  });

  it("recommendations exclude borrowed items", async () => {
    const app = createApp();
    const { member, librarian, book } = await seedTestData();

    const libLogin = await request(app)
      .post("/auth/login")
      .send({ email: "librarian@test.com", password: "password123" });
    const libToken = libLogin.body.accessToken;

    await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${libToken}`)
      .send({ userId: String(member._id), itemId: String(book._id) });

    const memLogin = await request(app)
      .post("/auth/login")
      .send({ email: "member@test.com", password: "password123" });
    const memToken = memLogin.body.accessToken;

    const recs = await request(app)
      .get(`/search/recommendations/${String(member._id)}`)
      .set("Authorization", `Bearer ${memToken}`);
    assert.equal(recs.status, 200);
    const ids = recs.body.map((r: { _id: string }) => String(r._id));
    assert.ok(!ids.includes(String(book._id)));
  });

  it("expires a ready hold after the pickup window", async () => {
    const app = createApp();
    const { member, librarian, book } = await seedTestData();
    const { HoldService } = await import("../../src/modules/holds/holdService");

    const libLogin = await request(app)
      .post("/auth/login")
      .send({ email: "librarian@test.com", password: "password123" });
    const libToken = libLogin.body.accessToken;
    const memLogin = await request(app)
      .post("/auth/login")
      .send({ email: "member@test.com", password: "password123" });
    const memToken = memLogin.body.accessToken;

    const checkout = await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${libToken}`)
      .send({ userId: String(librarian._id), itemId: String(book._id) });
    await request(app).post("/holds").set("Authorization", `Bearer ${memToken}`).send({ itemId: String(book._id) });
    const ret = await request(app)
      .post(`/circulation/returns/${checkout.body._id}`)
      .set("Authorization", `Bearer ${libToken}`);
    assert.equal(ret.body.holdReady.status, "ready");

    const expiredCount = await new HoldService().expireReadyHolds(new Date(Date.now() + 49 * 60 * 60 * 1000));
    assert.ok(expiredCount >= 1);
  });
});
