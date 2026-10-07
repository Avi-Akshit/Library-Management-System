import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../src/app";
import { setupTestDb, teardownTestDb, seedTestData } from "./helpers";

describe("integration: auth and circulation", () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it("registers, logs in, and accesses /auth/me", async () => {
    const app = createApp();
    const register = await request(app)
      .post("/auth/register")
      .send({ name: "New User", email: "new@test.com", password: "password123" });
    assert.equal(register.status, 201);
    assert.ok(register.body.accessToken);

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "new@test.com", password: "password123" });
    assert.equal(login.status, 200);
    const token = login.body.accessToken;

    const me = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.email, "new@test.com");
  });

  it("checkout → return flow with JWT auth", async () => {
    const app = createApp();
    const { member, librarian, book } = await seedTestData();

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "librarian@test.com", password: "password123" });
    const token = login.body.accessToken;

    const checkout = await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: String(member._id), itemId: String(book._id) });
    assert.equal(checkout.status, 201);
    const loanId = checkout.body._id;

    const ret = await request(app)
      .post(`/circulation/returns/${loanId}`)
      .set("Authorization", `Bearer ${token}`);
    assert.equal(ret.status, 200);
    assert.equal(ret.body.loan.status, "returned");
  });

  it("checks out the specifically scanned barcode", async () => {
    const app = createApp();
    const { member, book } = await seedTestData();
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "librarian@test.com", password: "password123" });
    const barcode = book.copies[1].barcode;
    const checkout = await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ userId: String(member._id), barcode });
    assert.equal(checkout.status, 201);
    assert.equal(String(checkout.body.copyId), String(book.copies[1]._id));
  });

  it("returns 409 on double checkout of last copy", async () => {
    const app = createApp();
    const { member, librarian, book2 } = await seedTestData();

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "librarian@test.com", password: "password123" });
    const token = login.body.accessToken;

    const first = await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: String(member._id), itemId: String(book2._id) });
    assert.equal(first.status, 201);

    const second = await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: String(librarian._id), itemId: String(book2._id) });
    assert.equal(second.status, 409);
  });

  it("hold queue assigns position and promotes on return", async () => {
    const app = createApp();
    const { member, librarian, book } = await seedTestData();

    const libLogin = await request(app)
      .post("/auth/login")
      .send({ email: "librarian@test.com", password: "password123" });
    const libToken = libLogin.body.accessToken;

    const memLogin = await request(app)
      .post("/auth/login")
      .send({ email: "member@test.com", password: "password123" });
    const memToken = memLogin.body.accessToken;

    await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${libToken}`)
      .send({ userId: String(librarian._id), itemId: String(book._id) });

    const hold = await request(app)
      .post("/holds")
      .set("Authorization", `Bearer ${memToken}`)
      .send({ itemId: String(book._id) });
    assert.equal(hold.status, 201);
    assert.equal(hold.body.position, 1);
    assert.equal(hold.body.status, "queued");

    const loans = await request(app)
      .get(`/circulation/loans/user/${librarian._id}`)
      .set("Authorization", `Bearer ${libToken}`);
    const loanId = loans.body[0]._id;

    const ret = await request(app)
      .post(`/circulation/returns/${loanId}`)
      .set("Authorization", `Bearer ${libToken}`);
    assert.equal(ret.status, 200);
    assert.ok(ret.body.holdReady);
    assert.equal(ret.body.holdReady.status, "ready");
  });
});
