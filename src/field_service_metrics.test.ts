import test from "node:test";
import assert from "node:assert/strict";
import { decideFollowUp } from "./field_service_metrics.ts";

test("a completed order without technician follow-up can close", () => {
  assert.equal(decideFollowUp({ id: "wo-1", photoCount: 3, dispatchStatus: "complete", technicianFollowUp: "none" }), "close");
  assert.equal(decideFollowUp({ id: "wo-2", photoCount: 1, dispatchStatus: "complete", technicianFollowUp: "return_visit" }), "follow-up");
});
