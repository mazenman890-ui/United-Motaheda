import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_KEY = "um_onboarding_v1";

export default function Entry() {
  const [target, setTarget] = useState<"/(tabs)" | "/onboarding" | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => {
        if (cancelled) return;
        setTarget(v === "1" ? "/(tabs)" : "/onboarding");
      })
      .catch(() => {
        if (cancelled) return;
        setTarget("/onboarding");
      });
    return () => { cancelled = true; };
  }, []);

  if (!target) {
    // White to match the SplashOverlay handoff (was navy → caused a brief
    // dark flash between splash fade-out and the redirect target mounting).
    return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  }
  return <Redirect href={target} />;
}
