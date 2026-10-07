import assert from "node:assert/strict";
import test from "node:test";
import { domainEvents } from "../src/events/eventBus";

test("domain event bus delivers typed event payloads", async () => {
  let delivered = "";
  domainEvents.on("HoldReady", async (event) => {
    delivered = String(event.payload.holdId);
  });

  await domainEvents.emit("HoldReady", { holdId: "hold-1", userId: "user-1", itemId: "item-1" });
  assert.equal(delivered, "hold-1");
});
