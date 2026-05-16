import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export function useHaptics() {
  const isNative = Platform.OS !== "web";

  return {
    light:     () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium:    () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    heavy:     () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    success:   () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning:   () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    error:     () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    selection: () => isNative && Haptics.selectionAsync(),
  };
}
