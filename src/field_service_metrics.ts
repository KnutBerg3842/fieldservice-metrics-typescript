import { z } from "zod";
import { infrai } from "./infrai.ts";

export const workOrderSchema = z.object({
  id: z.string().min(1),
  photoCount: z.number().int().nonnegative(),
  dispatchStatus: z.enum(["queued", "assigned", "en_route", "complete"]),
  technicianFollowUp: z.enum(["none", "customer_call", "return_visit"])
});

export type WorkOrder = z.infer<typeof workOrderSchema>;

export function decideFollowUp(order: WorkOrder): "follow-up" | "close" {
  return order.dispatchStatus === "complete" && order.technicianFollowUp === "none" ? "close" : "follow-up";
}

export async function reportWorkOrder(order: WorkOrder) {
  const parsed = workOrderSchema.parse(order);
  const decision = decideFollowUp(parsed);
  const tags = { dispatch_status: parsed.dispatchStatus, follow_up: parsed.technicianFollowUp };
  await infrai.metrics.report({ type: "counter", name: "fieldservice.work_orders", value: 1, tags, idempotency_key: `work-order:${parsed.id}` });
  await infrai.metrics.report({ type: "gauge", name: "fieldservice.photos_per_order", value: parsed.photoCount, tags, idempotency_key: `photos:${parsed.id}` });
  return { workOrderId: parsed.id, decision };
}

export async function main() {
  const order = workOrderSchema.parse({ id: process.env.WORK_ORDER_ID ?? "wo-demo-17", photoCount: 4, dispatchStatus: "complete", technicianFollowUp: "none" });
  const result = await reportWorkOrder(order);
  const usage = await infrai.account.usage.timeseries("2026-01-01", "2026-01-31");
  console.log(JSON.stringify({ result, usage }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
