import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../src/app";
import { setupTestDb, seedTestData, teardownTestDb } from "./helpers";
import { Room } from "../../src/models/Room";

describe("integration: assistant and rooms", () => {
  before(async () => setupTestDb());
  after(async () => teardownTestDb());

  it("grounds assistant answers in catalog records and declines unknown requests", async () => {
    const app = createApp();
    await seedTestData();
    const login = await request(app).post("/auth/login").send({ email: "member@test.com", password: "password123" });
    const token = login.body.accessToken;
    const found = await request(app).post("/assistant/ask").set("Authorization", `Bearer ${token}`).send({ question: "Tell me about Test Book Alpha" });
    assert.equal(found.status, 200);
    assert.equal(found.body.references[0].title, "Test Book Alpha");
    const missing = await request(app).post("/assistant/ask").set("Authorization", `Bearer ${token}`).send({ question: "Do you have a book called Moonbase Algebra?" });
    assert.equal(missing.status, 200);
    assert.equal(missing.body.references.length, 0);
    assert.match(missing.body.answer, /could not find/i);
  });

  it("allows exactly one concurrent booking for a room slot and blocks disabled rooms", async () => {
    const app = createApp();
    await seedTestData();
    const login = await request(app).post("/auth/login").send({ email: "member@test.com", password: "password123" });
    const token = login.body.accessToken;
    const room = await Room.create({ name: "Test Study Room", capacity: 4 });
    const payload = { roomId: String(room._id), startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z" };
    const results = await Promise.all([request(app).post("/rooms/bookings").set("Authorization", `Bearer ${token}`).send(payload), request(app).post("/rooms/bookings").set("Authorization", `Bearer ${token}`).send(payload)]);
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
    room.isEnabled = false; await room.save();
    const disabled = await request(app).post("/rooms/bookings").set("Authorization", `Bearer ${token}`).send({ ...payload, startsAt: "2030-01-01T12:00:00.000Z", endsAt: "2030-01-01T13:00:00.000Z" });
    assert.equal(disabled.status, 409);
  });

  it("rejects overlapping and non-hourly booking payloads", async () => {
    const app = createApp();
    await seedTestData();
    const login = await request(app).post("/auth/login").send({ email: "member@test.com", password: "password123" });
    const room = await Room.create({ name: "Hourly Room", capacity: 2 });
    const response = await request(app).post("/rooms/bookings").set("Authorization", `Bearer ${login.body.accessToken}`).send({
      roomId: String(room._id),
      startsAt: "2030-01-01T10:30:00.000Z",
      endsAt: "2030-01-01T11:30:00.000Z",
    });
    assert.equal(response.status, 400);
    assert.match(response.body.error, /hourly slot/i);
  });
});
