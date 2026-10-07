import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../src/app";
import { setupTestDb, teardownTestDb, seedTestData } from "./helpers";

describe("integration: concurrent double-checkout prevention", () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  it("allows only one checkout when two requests race for the last copy", async () => {
    const app = createApp();
    const { member, librarian, book2 } = await seedTestData();
    // book2 has exactly one copy

    const libLogin = await request(app)
      .post("/auth/login")
      .send({ email: "librarian@test.com", password: "password123" });
    assert.equal(libLogin.status, 200);
    const token = libLogin.body.accessToken;

    // Fire both checkouts simultaneously
    const [first, second] = await Promise.all([
      request(app)
        .post("/circulation/checkouts")
        .set("Authorization", `Bearer ${token}`)
        .send({ userId: String(member._id), itemId: String(book2._id) }),
      request(app)
        .post("/circulation/checkouts")
        .set("Authorization", `Bearer ${token}`)
        .send({ userId: String(librarian._id), itemId: String(book2._id) }),
    ]);

    const statuses = [first.status, second.status].sort();
    // Exactly one 201 and one 409
    assert.deepEqual(statuses, [201, 409]);
  });

  it("refresh token flow: login → refresh → access protected route", async () => {
    const app = createApp();
    await seedTestData();

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "member@test.com", password: "password123" });
    assert.equal(login.status, 200);
    assert.ok(login.body.accessToken, "should return accessToken");
    assert.ok(login.body.refreshToken, "should return refreshToken");

    const refresh = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: login.body.refreshToken });
    assert.equal(refresh.status, 200);
    assert.ok(refresh.body.accessToken, "refresh should return new accessToken");
    assert.ok(refresh.body.refreshToken, "refresh should return new refreshToken");
    assert.notEqual(refresh.body.refreshToken, login.body.refreshToken, "token should rotate");

    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${refresh.body.accessToken}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.email, "member@test.com");
  });

  it("logout revokes refresh token", async () => {
    const app = createApp();
    await seedTestData();

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "member@test.com", password: "password123" });
    const { refreshToken } = login.body;

    const logout = await request(app)
      .post("/auth/logout")
      .send({ refreshToken });
    assert.equal(logout.status, 204);

    const refresh = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken });
    assert.equal(refresh.status, 401);
  });

  it("renewal is blocked when an active hold queue exists", async () => {
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

    // Librarian checks out the book
    const checkout = await request(app)
      .post("/circulation/checkouts")
      .set("Authorization", `Bearer ${libToken}`)
      .send({ userId: String(librarian._id), itemId: String(book._id) });
    assert.equal(checkout.status, 201);
    const loanId = checkout.body._id;

    // Member places a hold
    const hold = await request(app)
      .post("/holds")
      .set("Authorization", `Bearer ${memToken}`)
      .send({ itemId: String(book._id) });
    assert.equal(hold.status, 201);

    // Renewal should now be blocked
    const renew = await request(app)
      .post(`/circulation/renewals/${loanId}`)
      .set("Authorization", `Bearer ${libToken}`);
    assert.equal(renew.status, 409);
    assert.ok(renew.body.error.includes("waiting"), "error should mention waiting patrons");
  });
});
