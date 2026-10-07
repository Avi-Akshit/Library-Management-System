import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import request from "supertest";
import { createApp } from "../../src/app";
import { PasswordResetToken } from "../../src/models/PasswordResetToken";
import { setupTestDb, seedTestData, teardownTestDb } from "./helpers";

describe("integration: password recovery and library locations", () => {
  before(async () => setupTestDb());
  after(async () => teardownTestDb());

  it("resets a password once and revokes the previous session", async () => {
    const app = createApp();
    const { member } = await seedTestData();
    const login = await request(app).post("/auth/login").send({ email: "member@test.com", password: "password123" });
    const rawToken = crypto.randomBytes(32).toString("hex");
    await PasswordResetToken.create({ userId: member._id, tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"), expiresAt: new Date(Date.now() + 60_000) });
    const reset = await request(app).post("/auth/reset-password").send({ token: rawToken, password: "new-password123" });
    assert.equal(reset.status, 204);
    const oldSession = await request(app).post("/auth/refresh").send({ refreshToken: login.body.refreshToken });
    assert.equal(oldSession.status, 401);
    const newLogin = await request(app).post("/auth/login").send({ email: "member@test.com", password: "new-password123" });
    assert.equal(newLogin.status, 200);
    const replay = await request(app).post("/auth/reset-password").send({ token: rawToken, password: "another-password123" });
    assert.equal(replay.status, 400);
  });

  it("requires the current password before a signed-in user can change it", async () => {
    const app = createApp();
    await seedTestData();
    const login = await request(app).post("/auth/login").send({ email: "member@test.com", password: "password123" });
    const denied = await request(app).post("/auth/change-password").set("Authorization", `Bearer ${login.body.accessToken}`).send({ currentPassword: "incorrect", password: "changed-password123" });
    assert.equal(denied.status, 401);
    const changed = await request(app).post("/auth/change-password").set("Authorization", `Bearer ${login.body.accessToken}`).send({ currentPassword: "password123", password: "changed-password123" });
    assert.equal(changed.status, 204);
    const nextLogin = await request(app).post("/auth/login").send({ email: "member@test.com", password: "changed-password123" });
    assert.equal(nextLogin.status, 200);
  });

  it("lets only a super-admin add a new library location", async () => {
    const app = createApp();
    await seedTestData();
    const librarian = await request(app).post("/auth/login").send({ email: "librarian@test.com", password: "password123" });
    const admin = await request(app).post("/auth/login").send({ email: "admin@test.com", password: "password123" });
    const payload = { name: "West Library", code: "WEST", address: "2 West Road" };
    const forbidden = await request(app).post("/branches").set("Authorization", `Bearer ${librarian.body.accessToken}`).send(payload);
    assert.equal(forbidden.status, 403);
    const created = await request(app).post("/branches").set("Authorization", `Bearer ${admin.body.accessToken}`).send(payload);
    assert.equal(created.status, 201);
    const locations = await request(app).get("/branches").set("Authorization", `Bearer ${admin.body.accessToken}`);
    assert.equal(locations.body.length, 2);
  });
});
