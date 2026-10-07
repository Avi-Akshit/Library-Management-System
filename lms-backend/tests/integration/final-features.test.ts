import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../src/app";
import { setupTestDb, teardownTestDb, seedTestData } from "./helpers";
import { Hold } from "../../src/models/Hold";
import { HoldService } from "../../src/modules/holds/holdService";

describe("integration: final catalog features", () => {
  before(async () => setupTestDb());
  after(async () => teardownTestDb());

  it("keeps interest separate from the hold queue and provides dynamic facets", async () => {
    const app = createApp();
    const { member, book } = await seedTestData();
    const login = await request(app).post("/auth/login").send({ email: "member@test.com", password: "password123" });
    const token = login.body.accessToken;
    const interest = await request(app).post("/interests").set("Authorization", `Bearer ${token}`).send({ itemId: String(book._id), reason: "availability" });
    assert.equal(interest.status, 201);
    const holds = await request(app).get(`/holds/user/${member._id}`).set("Authorization", `Bearer ${token}`);
    assert.equal(holds.body.length, 0);
    const facets = await request(app).get("/search/faceted?q=Alpha&language=en");
    assert.equal(facets.status, 200);
    assert.equal(facets.body.items.length, 1);
  });

  it("reviews import before commit and staff resolves a reported issue", async () => {
    const app = createApp();
    const { member, librarian, book } = await seedTestData();
    const memberLogin = await request(app).post("/auth/login").send({ email: "member@test.com", password: "password123" });
    const issue = await request(app).post(`/issues/items/${book._id}`).set("Authorization", `Bearer ${memberLogin.body.accessToken}`).send({ copyId: String(book.copies[0]._id), type: "damaged", note: "Loose binding" });
    assert.equal(issue.status, 201);
    const librarianLogin = await request(app).post("/auth/login").send({ email: "librarian@test.com", password: "password123" });
    const token = librarianLogin.body.accessToken;
    const rows = [{ title: "Imported Record", creators: ["Test Author"], isbn: "9780000000001", copies: [{ barcode: "IMPORT-1" }] }];
    const preview = await request(app).post("/catalog/import/preview").set("Authorization", `Bearer ${token}`).send({ rows });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.review[0].status, "new");
    const committed = await request(app).post("/catalog/import/commit").set("Authorization", `Bearer ${token}`).send({ rows });
    assert.equal(committed.status, 201);
    const resolved = await request(app).post(`/issues/${issue.body._id}/resolve`).set("Authorization", `Bearer ${token}`);
    assert.equal(resolved.status, 200);
    assert.equal(String(resolved.body.resolvedBy), String(librarian._id));
  });

  it("does not allow an issue to be attached to a copy from another item", async () => {
    const app = createApp();
    const { book, book2 } = await seedTestData();
    const login = await request(app).post("/auth/login").send({ email: "member@test.com", password: "password123" });
    const response = await request(app).post(`/issues/items/${book._id}`).set("Authorization", `Bearer ${login.body.accessToken}`).send({
      copyId: String(book2.copies[0]._id), type: "damaged",
    });
    assert.equal(response.status, 400);
    assert.match(response.body.error, /does not belong/i);
  });

  it("requeues an expired pickup at the back and promotes the next member", async () => {
    const { branch, member, librarian, book } = await seedTestData();
    const first = await Hold.create({ itemId: book._id, userId: member._id, pickupBranchId: branch._id, position: 1, status: "ready", readyAt: new Date(Date.now() - 72 * 60 * 60 * 1000), expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) });
    const second = await Hold.create({ itemId: book._id, userId: librarian._id, pickupBranchId: branch._id, position: 2, status: "queued" });
    await new HoldService().expireReadyHolds(new Date());
    const renewedFirst = await Hold.findById(first._id);
    const promotedSecond = await Hold.findById(second._id);
    assert.equal(renewedFirst?.status, "queued");
    assert.equal(renewedFirst?.position, 3);
    assert.equal(promotedSecond?.status, "ready");
  });
});
