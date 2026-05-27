import React from "react";
import { OrdersScreen } from "@/features/orders";

/**
 * Tab entry — uses the same OrdersScreen body as the top-level /orders route,
 * but suppresses the back-button header since the tab bar provides navigation.
 */
export default function OrdersTab(): React.ReactElement {
  return <OrdersScreen showBack={false} />;
}
