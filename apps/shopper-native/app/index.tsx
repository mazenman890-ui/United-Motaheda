import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "@/theme";

export const ONBOARDING_KEY = "um_onboarding_v1";

export default function Entry() {
  const [target, setTarget] = useState<"/(tabs)" | "/onboarding" | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => setTarget(v === "1" ? "/(tabs)" : "/onboarding"))
      .catch(() => setTarget("/onboarding"));
  }, []);

  if (!target) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.hero }} />;
  }
  return <Redirect href={target} />;
}
