/**
 * Bridges device connectivity + foreground state into React Query.
 *
 *  - NetInfo  → onlineManager  : queries pause when truly offline (radio
 *               off / airplane mode), resume on reconnect with refetch.
 *  - AppState → focusManager   : foregrounding the app revalidates queries
 *               whose data may have changed while we were backgrounded
 *               (cart, orders, loyalty balance).
 *
 * Mount <NetworkBridge /> once near the root, inside QueryClientProvider.
 */

import { useEffect } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";

function isOnline(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  // isInternetReachable can be null on first sample — assume reachable until
  // proven otherwise, since onlineManager defaults to true and we don't want
  // a momentary flicker to pause every query.
  return state.isInternetReachable !== false;
}

export function NetworkBridge(): null {
  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(isOnline(state));
    });

    const onAppState = (status: AppStateStatus) => {
      if (Platform.OS === "web") return;
      focusManager.setFocused(status === "active");
    };
    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      unsubNet();
      sub.remove();
    };
  }, []);

  return null;
}
