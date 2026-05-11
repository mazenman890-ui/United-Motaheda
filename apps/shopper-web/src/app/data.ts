import brandLogo from "../assets/united-pharmacy-logo.png";
import brandMark from "../assets/united-pharmacy-mark.png";
import heroIcon from "../assets/united-pharmacy-hero-icon.png";
import heroLogo from "../assets/united-pharmacy-hero-logo.png";
import pharmacyInterior from "../assets/pharmacy-interior.jpg";
import pharmacyInteriorBrand from "../assets/pharmacy-interior-brand.jpg";
import pharmacyInteriorCounter from "../assets/pharmacy-interior-counter.jpg";
import pharmacyInteriorShelves from "../assets/pharmacy-interior-shelves.jpg";
import pharmacyHomeWide from "../assets/pharmacy-home-wide.jpg";
import pharmacyHomePortrait from "../assets/pharmacy-home-portrait.jpg";
import { getServiceHoursSentence } from "./config";

export const images = {
  pic0: pharmacyInteriorBrand,
  pic1: pharmacyInterior,
  pic2: pharmacyInteriorCounter,
  pic3: pharmacyInteriorShelves,
  homeWide: pharmacyHomeWide,
  homePortrait: pharmacyHomePortrait,
  logo: brandLogo,
  logoMark: brandMark,
  logoHero: heroIcon,
  heroLogo,
  videoLink: "https://www.canva.com/design/DAHFcw0san0/rFsIDX1QRsFF_QYZua20hA/watch?embed",
};

/** Additional promo clips (same or alternate embeds). */
export const promoVideoGallery = [
  {
    id: "main",
    titleAr: "تعريف بالمنصة",
    titleEn: "Platform overview",
    src: "https://www.canva.com/design/DAHFcw0san0/rFsIDX1QRsFF_QYZua20hA/watch?embed",
  },
  {
    id: "walkthrough",
    titleAr: "جولة إضافية في الخدمة",
    titleEn: "Additional service walkthrough",
    src: "https://www.canva.com/design/DAHFcw0san0/rFsIDX1QRsFF_QYZua20hA/watch?embed",
  },
] as const;

export const siteContact = {
  phoneDisplay: "010 12255595",
  phoneHref: "01012255595",
  whatsappDisplay: "+20 11 12343212",
  whatsappHref: "201112343212",
  email: "united.pharmacy.eg@gmail.com",
  whatsappUrl: "https://wa.me/201112343212?text=Hello,%20I%20need%20help%20with%20my%20order",
} as const;

export const siteSocials = [
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/united.pharmacy.eg/" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/united.pharmacy.eg" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@united.pharmacy.eg" },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/@united.pharmacyeg" },
] as const;

const sharedBranchHoursAr = getServiceHoursSentence("ar");
const sharedBranchHoursEn = getServiceHoursSentence("en");
const supportLine = "01012255595";
const whatsappSupportLine = "01112343212";

const buildBranchDirectionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

export type SiteLocation = {
  id: string;
  nameAr: string;
  nameEn: string;
  fullNameAr: string;
  fullNameEn: string;
  addressAr: string;
  addressEn: string;
  phones: string[];
  hoursAr: string;
  hoursEn: string;
  mapsDirectionsUrl: string;
  mapQuery: string;
  lat: number;
  lng: number;
  mapZoom: number;
  isPrimary: boolean;
  governorate: "Cairo";
  area: string;
  deliveryEnabled: boolean;
  mapEmbedSrc?: string;
};

export const locations = [
  {
    id: "cairo",
    nameAr: "القاهرة",
    nameEn: "Cairo",
    fullNameAr: "صيدليات المتحدة - القاهرة",
    fullNameEn: "United Pharmacies - Cairo",
    addressAr: "محافظة القاهرة",
    addressEn: "Cairo Governorate",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.0444, 31.2357),
    mapQuery: "Cairo,Egypt",
    lat: 30.0444,
    lng: 31.2357,
    mapZoom: 11,
    isPrimary: true,
    governorate: "Cairo",
    area: "Cairo",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110502.76!2d31.2357!3d30.0444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583fa60b21beeb%3A0x79dfb296e8423bba!2sCairo%2C%20Cairo%20Governorate!5e0!3m2!1sen!2seg!4v1",
  },
] satisfies readonly SiteLocation[];

export const deliveryLocations = locations.filter((location) => location.deliveryEnabled);
