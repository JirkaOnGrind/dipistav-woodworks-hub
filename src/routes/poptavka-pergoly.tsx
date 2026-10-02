import { createFileRoute } from "@tanstack/react-router";
import { OrderFlowPage } from "@/components/order-flow-page";

export const Route = createFileRoute("/poptavka-pergoly")({
  head: () => ({ meta: [{ title: "Poptávka pergoly | DIPISTAV" }] }),
  component: () => <OrderFlowPage flow="pergola_inquiry" />,
});
