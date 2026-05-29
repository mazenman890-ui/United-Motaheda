/**
 * Camera scan flow — Day-8 placeholder.
 *
 * // HANDOFF: deviated — real expo-camera viewfinder + frame overlay + OCR
 * // mock lands on Day 8 per HANDOFF §7. Stub keeps the route resolvable.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { ComingSoonScreen } from "@/shared/components";

export default function Page(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <ComingSoonScreen
      title={t("prescriptions.scanTitle")}
      subtitle={t("prescriptions.scanSubtitle")}
      icon="scan-outline"
    />
  );
}
