import { createFileRoute } from "@tanstack/react-router";
import { OrderFlowPage } from "@/components/order-flow-page";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Dokončení objednávky | DIPISTAV" }] }),
  component: () => <OrderFlowPage flow="order" />,
});
