/**
 * PromoBanner — trust strip + auto-scrolling promo carousel.
 *
 * Trust strip: elevated white card with four delivery/quality badges,
 * visually overlapping the bottom of the hero (marginTop: -28).
 *
 * PromoCarousel: FlatList with 4.2-second auto-advance and dot indicators.
 *
 * Removed: two FadeInDown entrance animations (TrustStrip + carouselWrap).
 * The component mounts instantly — entrance animations were delaying first
 * paint without providing any UX value on a home screen that loads fast.
 */

import React, { memo, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Promo slide data ─────────────────────────────────────────────────────────

const PROMO_SLIDES = [
  {
    id:       "1",
    gradient: [theme.colors.hero, "#053348", "#0A4A65"] as [string, string, string],
    tagKey:   "home.heroTag1",
    titleKey: "home.heroTitle1",
    subKey:   "home.heroSub1",
    icon:     "ticket"  as IoniconsName,
    accent:   theme.colors.teal[500],
    glowColor:"rgba(13,184,168,0.18)",
    route:    "/deals",
  },
  {
    id:       "2",
    gradient: ["#064E3B", theme.colors.teal[800], theme.colors.teal[600]] as [string, string, string],
    tagKey:   "home.heroTag2",
    titleKey: "home.heroTitle2",
    subKey:   "home.heroSub2",
    icon:     "bicycle" as IoniconsName,
    accent:   "#34D399",
    glowColor:"rgba(52,211,153,0.18)",
    route:    "/(tabs)/products",
  },
  {
    id:       "3",
    gradient: ["#3B0764", "#5B21B6", "#6D28D9"] as [string, string, string],
    tagKey:   "home.heroTag3",
    titleKey: "home.heroTitle3",
    subKey:   "home.heroSub3",
    icon:     "diamond" as IoniconsName,
    accent:   "#C084FC",
    glowColor:"rgba(192,132,252,0.18)",
    route:    "/loyalty",
  },
];

// ─── Trust badges data ────────────────────────────────────────────────────────

const useTrustBadges = () => {
  const { t } = useTranslation();
  return [
    { icon: "flash-outline"            as IoniconsName, label: t("cart.fastDelivery"),       grad: [theme.colors.amber[600], theme.colors.amber[500]] as [string, string] },
    { icon: "shield-checkmark-outline" as IoniconsName, label: t("home.origMedicines"),      grad: ["#059669", "#10B981"]                             as [string, string] },
    { icon: "wallet-outline"           as IoniconsName, label: t("checkout.methodCodTitle"), grad: [theme.colors.brand[600], theme.colors.teal[500]]  as [string, string] },
    { icon: "refresh-outline"          as IoniconsName, label: t("cart.guaranteedReturns"),  grad: ["#6D28D9", "#7C3AED"]                             as [string, string] },
  ];
};

// ─── PromoBanner ──────────────────────────────────────────────────────────────

interface PromoBannerProps {
  onSlidePress: (route: string) => void;
}

export const PromoBanner = memo(function PromoBanner({ onSlidePress }: PromoBannerProps) {
  return (
    <>
      {/* Trust strip — overlaps bottom of hero */}
      <TrustStrip />
      {/* Promo carousel */}
      <View style={s.carouselWrap}>
        <PromoCarousel onSlidePress={onSlidePress} />
      </View>
    </>
  );
});

// ─── TrustStrip ───────────────────────────────────────────────────────────────

const TrustStrip = memo(function TrustStrip() {
  const badges = useTrustBadges();
  return (
    <View style={s.trustWrap}>
      <View style={s.trustCard}>
        {badges.map((b, i) => (
          <View
            key={b.icon}
            style={[s.trustCell, i < badges.length - 1 && s.trustDivider]}>
            <LinearGradient
              colors={b.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.trustIcon}>
              <Ionicons name={b.icon} size={13} color="#fff" />
            </LinearGradient>
            <UIText variant="eyebrow" align="center" style={s.trustLabel}>
              {b.label}
            </UIText>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── PromoCarousel ────────────────────────────────────────────────────────────

const PromoCarousel = memo(function PromoCarousel({
  onSlidePress,
}: { onSlidePress: (route: string) => void }) {
  const { width: screenW } = useWindowDimensions();
  const { t }              = useTranslation();
  const listRef    = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);

  const SLIDE_H = 160;

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentRef.current + 1) % PROMO_SLIDES.length;
      listRef.current?.scrollToOffset({ offset: next * screenW, animated: true });
      currentRef.current = next;
      setCurrent(next);
    }, 4200);
    return () => clearInterval(timer);
  }, [screenW]);

  return (
    <View>
      <FlatList
        ref={listRef}
        data={PROMO_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / screenW);
          currentRef.current = idx;
          setCurrent(idx);
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSlidePress(item.route)}
            style={({ pressed }) => ({ opacity: pressed ? 0.93 : 1, width: screenW })}>
            <View style={s.slideOuter}>
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.slide, { height: SLIDE_H }]}>
                <View style={[s.glowOrb,  { backgroundColor: item.glowColor }]} />
                <View style={[s.glowOrb2, { backgroundColor: item.glowColor }]} />
                <View style={[s.gridLine, { left: "33%" }]} />
                <View style={[s.gridLine, { left: "66%" }]} />

                <View style={s.slideRow}>
                  <View style={s.copy}>
                    <View style={s.tagRow}>
                      <View style={[s.tagPill, { backgroundColor: item.accent + "28", borderColor: item.accent + "50" }]}>
                        <UIText variant="eyebrow" style={{ color: item.accent, letterSpacing: 0.5 }}>
                          {t(item.tagKey)}
                        </UIText>
                      </View>
                    </View>
                    <UIText
                      variant="sheet-title"
                      color="inverse"
                      align="right"
                      style={s.slideTitle}>
                      {t(item.titleKey)}
                    </UIText>
                    <UIText
                      variant="body-sm"
                      color="inverse-muted"
                      align="right"
                      style={s.slideSub}>
                      {t(item.subKey)}
                    </UIText>
                  </View>

                  <View style={[s.iconTile, { borderColor: item.accent + "40" }]}>
                    <LinearGradient
                      colors={[item.accent + "22", item.accent + "0A"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name={item.icon} size={28} color={item.accent} />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Pressable>
        )}
      />

      {/* Dot indicators */}
      <View style={s.dotsRow}>
        {PROMO_SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i === current && [s.dotActive, { backgroundColor: PROMO_SLIDES[current].accent }],
            ]}
          />
        ))}
      </View>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Trust strip ─────────────────────────────────────────────────────────────
  trustWrap: {
    marginTop:        -28,
    marginHorizontal: theme.spacing[4],  // 32 — intentional inset for floating card
    marginBottom:     theme.spacing.lg,  // 16
  },
  trustCard: {
    backgroundColor:   "#fff",
    borderRadius:      22,
    paddingVertical:   14,
    paddingHorizontal: 4,
    flexDirection:     "row-reverse",
    shadowColor:       "#0C2240",
    shadowOffset:      { width: 0, height: 6 },
    shadowOpacity:     0.12,
    shadowRadius:      18,
    elevation:         8,
  },
  trustCell: {
    flex:              1,
    alignItems:        "center",
    gap:               7,
    paddingHorizontal: 4,
  },
  trustDivider: {
    borderRightWidth:  StyleSheet.hairlineWidth,
    borderRightColor:  "rgba(15,23,42,0.08)",
  },
  trustIcon: {
    width:          32,
    height:         32,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  trustLabel: {
    color:      theme.colors.slate[600],
    fontSize:   9.5,
    fontFamily: theme.fonts.bold,
    lineHeight: 13,
  },

  // ── Carousel ─────────────────────────────────────────────────────────────────
  carouselWrap: {
    paddingTop:    theme.spacing['2xl'],  // 24 — was 48 (theme.spacing[6])
    paddingBottom: theme.spacing.sm,      // 8
  },
  slideOuter: { paddingHorizontal: theme.layout.pagePaddingH },
  slide: {
    borderRadius:  24,
    padding:       22,
    overflow:      "hidden",
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius:  16,
    elevation:     8,
  },
  glowOrb: {
    position:     "absolute",
    top:          -60,
    right:        -60,
    width:        140,
    height:       140,
    borderRadius: 70,
  },
  glowOrb2: {
    position:     "absolute",
    bottom:       -50,
    left:         -40,
    width:        110,
    height:       110,
    borderRadius: 55,
  },
  gridLine: {
    position:        "absolute",
    top:             0,
    bottom:          0,
    width:           1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  slideRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  copy:        { flex: 1, gap: 6 },
  tagRow:      { flexDirection: "row-reverse" },
  tagPill: {
    borderRadius:      999,
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderWidth:       1,
  },
  slideTitle: { letterSpacing: -0.5, lineHeight: 30 },
  slideSub:   { lineHeight: 17, fontSize: 12 },
  iconTile: {
    width:          66,
    height:         66,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1.5,
    marginStart:    16,
    overflow:       "hidden",
  },
  dotsRow: {
    flexDirection:  "row",
    justifyContent: "center",
    gap:            5,
    marginTop:      14,
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: theme.colors.slate[300],
  },
  dotActive: { width: 24, borderRadius: 3 },
});
