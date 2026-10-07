import assert from "node:assert/strict";
import test from "node:test";
import { PolicyEngine } from "../src/modules/circulation/policyEngine";

test("policy engine resolves configurable loan duration by member and item type", () => {
  const engine = new PolicyEngine([
    { itemType: "book", memberType: "student", loanDays: 10, renewalLimit: 1, finePerDayCents: 50, maxActiveLoans: 3 },
    { itemType: "book", memberType: "faculty", loanDays: 30, renewalLimit: 3, finePerDayCents: 25, maxActiveLoans: 10 },
  ]);

  assert.equal(engine.dueDate(new Date("2026-09-05T00:00:00.000Z"), "book", "student").toISOString(), "2026-09-15T00:00:00.000Z");
  assert.equal(engine.dueDate(new Date("2026-09-05T00:00:00.000Z"), "book", "faculty").toISOString(), "2026-10-05T00:00:00.000Z");
});

test("policy engine accrues fines by late day ceiling", () => {
  const engine = new PolicyEngine([
    { itemType: "journal", memberType: "guest", loanDays: 3, renewalLimit: 0, finePerDayCents: 125, maxActiveLoans: 1 },
  ]);

  const fine = engine.fineForReturn(
    new Date("2026-09-05T00:00:00.000Z"),
    new Date("2026-09-06T01:00:00.000Z"),
    "journal",
    "guest",
  );

  assert.equal(fine, 250);
});
