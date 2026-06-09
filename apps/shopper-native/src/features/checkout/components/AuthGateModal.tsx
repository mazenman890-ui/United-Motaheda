import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text as UIText } from "@/shared/ui";
import Animated, {
  cancelAnimation,
  FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";

interface AuthGateModalProps {
  visible:   boolean;
  onSignIn:  () => void;
  onDismiss: () => void;
}

export const AuthGateModal = React.memo(function AuthGateModal({
  visible,
  onSignIn,
  onDismiss,
}: AuthGateModalProps) {
  const { t } = useTranslation();

  // Pulsing rings
  const ring1    = useSharedValue(1);
  const ring2    = useSharedValue(1);
  const ring1Op  = useSharedValue(0.5);
  const ring2Op  = useSharedValue(0.3);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(ring1);
      cancelAnimation(ring1Op);
      cancelAnimation(ring2);
      cancelAnimation(ring2Op);
      return;
    }
    ring1.value = withRepeat(
      withSequence(withTiming(1.35, { duration: 1600 }), withTiming(1, { duration: 1200 })),
      -1, false,
    );
    ring1Op.value = withRepeat(
      withSequence(withTiming(0, { duration: 1600 }), withTiming(0.5, { duration: 1200 })),
      -1, false,
    );
    ring2.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 800  }),
        withTiming(1.6, { duration: 1800 }),
        withTiming(1,   { duration: 800  }),
      ),
      -1, false,
    );
    ring2Op.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800  }),
        withTiming(0,   { duration: 1800 }),
        withTiming(0.3, { duration: 800  }),
      ),
      -1, false,
    );
  }, [visible, ring1, ring1Op, ring2, ring2Op]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity:   ring1Op.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity:   ring2Op.value,
  }));

  // Card entrance
  const cardScale = useSharedValue(0.88);
  const cardOp    = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      cardScale.value = withSpring(1, { damping: 18, stiffness: 280 });
      cardOp.value    = withTiming(1, { duration: 240 });
    } else {
      cardScale.value = 0.88;
      cardOp.value    = 0;
    }
  }, [visible, cardScale, cardOp]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity:   cardOp.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
      accessibilityViewIsModal>
      <Pressable style={s.backdrop} onPress={onDismiss}>
        <Animated.View
          style={[s.card, cardStyle]}
          onStartShouldSetResponder={() => true}>

          <View style={s.orbArea}>
            <Animated.View style={[s.ring, s.ring1, ring2Style]} />
            <Animated.View style={[s.ring, s.ring2, ring1Style]} />
            <LinearGradient
              colors={["#1e3a5f", "#0d5c8e", theme.colors.brand[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.orb}>
              <View style={s.orbInner}>
                <Ionicons name="person-circle" size={42} color="rgba(255,255,255,0.95)" />
              </View>
            </LinearGradient>
          </View>

          <Animated.View entering={FadeInDown.delay(120).duration(280)} style={s.copy}>
            <UIText style={s.title}>{t("checkout.authGateTitle")}</UIText>
            <UIText style={s.body}>{t("checkout.authGateBody")}</UIText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(280)} style={s.pillsRow}>
            {(["flash-outline", "shield-checkmark-outline", "location-outline"] as const).map(
              (icon, i) => (
                <View key={i} style={s.pill}>
                  <Ionicons name={icon} size={11} color={theme.colors.brand[600]} />
                </View>
              ),
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(260).duration(280)} style={s.actions}>
            <Pressable
              onPress={onSignIn}
              style={({ pressed }) => [s.signInBtn, pressed && { opacity: 0.9 }]}>
              <LinearGradient
                colors={[theme.colors.brand[600], theme.colors.teal[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.signInGrad}>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <UIText style={s.signInText}>{t("checkout.authGateSignIn")}</UIText>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onDismiss} hitSlop={8} style={s.dismissBtn}>
              <UIText style={s.dismissText}>{t("checkout.authGateDismiss")}</UIText>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

const s = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: "rgba(2, 10, 22, 0.72)",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         28,
  },
  card: {
    width:             "100%",
    maxWidth:          360,
    backgroundColor:   "#fff",
    borderRadius:      32,
    paddingBottom:     28,
    paddingHorizontal: 24,
    alignItems:        "center",
    overflow:          "hidden",
    shadowColor:       theme.colors.hero,
    shadowOffset:      { width: 0, height: 20 },
    shadowOpacity:     0.40,
    shadowRadius:      40,
    elevation:         24,
  },
  orbArea: {
    marginTop:      36,
    marginBottom:   8,
    width:          110,
    height:         110,
    alignItems:     "center",
    justifyContent: "center",
  },
  ring: {
    position:     "absolute",
    borderRadius: 999,
    borderWidth:  1.5,
  },
  ring1: { width: 110, height: 110, borderColor: theme.colors.brand[600] },
  ring2: { width: 88,  height: 88,  borderColor: theme.colors.teal[500]  },
  orb: {
    width:          76,
    height:         76,
    borderRadius:   38,
    alignItems:     "center",
    justifyContent: "center",
  },
  orbInner: {
    width:           68,
    height:          68,
    borderRadius:    34,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  copy: {
    alignItems:   "center",
    gap:          10,
    marginTop:    16,
    marginBottom: 4,
  },
  title: {
    fontFamily:    theme.fonts.black,
    fontSize:      20,
    color:         theme.colors.slate[900],
    textAlign:     "center",
    letterSpacing: -0.5,
    lineHeight:    26,
  },
  body: {
    fontFamily: theme.fonts.regular,
    fontSize:   13.5,
    color:      theme.colors.slate[500],
    textAlign:  "center",
    lineHeight: 20,
    maxWidth:   280,
  },
  pillsRow: {
    flexDirection: "row",
    gap:           8,
    marginTop:     16,
    marginBottom:  4,
  },
  pill: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: "#EFF9FC",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "#BAE6F5",
  },
  actions:    { width: "100%", gap: 10, marginTop: 20 },
  signInBtn:  { borderRadius: 16, overflow: "hidden" },
  signInGrad: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             10,
    paddingVertical: 16,
    borderRadius:    16,
  },
  signInText: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         "#fff",
    letterSpacing: -0.3,
  },
  dismissBtn: { alignItems: "center", paddingVertical: 10 },
  dismissText: {
    fontFamily: theme.fonts.semibold,
    fontSize:   13,
    color:      theme.colors.slate[400],
  },
});
