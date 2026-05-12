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
const zahraaLine = "01090530095";

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
    id: "gardenia",
    nameAr: "جاردينيا سيتي",
    nameEn: "Gardenia City",
    fullNameAr: "صيدليات المتحدة - جاردينيا سيتي",
    fullNameEn: "United Pharmacies - Gardenia City",
    addressAr: "مول جاردينيا سيتي، وراك كومباوند، القاهرة الجديدة",
    addressEn: "Gardenia City Mall, Warak Compound, New Cairo",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.0827, 31.3853),
    mapQuery: "30.0827,31.3853",
    lat: 30.0827,
    lng: 31.3853,
    mapZoom: 16,
    isPrimary: true,
    governorate: "Cairo",
    area: "القاهرة الجديدة",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3452.31!2d31.3853!3d30.0827!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDA0JzU3LjciTiAzMcKwMjMnMDcuMSJF!5e0!3m2!1sen!2seg!4v1",
  },
  {
    id: "maadi",
    nameAr: "شارع فلسطين",
    nameEn: "Palestine Street",
    fullNameAr: "صيدليات المتحدة - شارع فلسطين",
    fullNameEn: "United Pharmacies - Palestine Street",
    addressAr: "١ شارع فلسطين، البساتين الشرقية، المعادي، القاهرة",
    addressEn: "1 Palestine Rd, El-Basatin Sharkeya, Maadi, Cairo",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.0146, 31.2824),
    mapQuery: "30.0146,31.2824",
    lat: 30.0146,
    lng: 31.2824,
    mapZoom: 17,
    isPrimary: false,
    governorate: "Cairo",
    area: "المعادي",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3454.8!2d31.2824!3d30.0146!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAwJzUyLjYiTiAzMcKwMTYnNTYuNiJF!5e0!3m2!1sen!2seg!4v1",
  },
  {
    id: "nasr-city-hay-asher",
    nameAr: "الحي العاشر",
    nameEn: "Al Hay Al Asher",
    fullNameAr: "صيدليات المتحدة - الحي العاشر",
    fullNameEn: "United Pharmacies - Al Hay Al Asher",
    addressAr: "الحي العاشر، مدينة نصر، القاهرة",
    addressEn: "Al Hay Al Asher, Nasr City, Cairo",
    phones: [zahraaLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.0485, 31.3533),
    mapQuery: "30.0485,31.3533",
    lat: 30.0485,
    lng: 31.3533,
    mapZoom: 17,
    isPrimary: false,
    governorate: "Cairo",
    area: "مدينة نصر",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.5!2d31.3533!3d30.0485!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAyJzU0LjYiTiAzMcKwMjEnMTEuOSJF!5e0!3m2!1sen!2seg!4v1",
  },
  {
    id: "zahraa-gomhoureya",
    nameAr: "شارع الجمهورية",
    nameEn: "El Gomhoureya St.",
    fullNameAr: "صيدليات المتحدة - زهراء الجمهورية",
    fullNameEn: "United Pharmacies - Zahraa El Gomhoureya",
    addressAr: "شارع الجمهورية ع١٤، زهراء مدينة نصر، القاهرة",
    addressEn: "El Gomhoureya St. #14, Zahraa Nasr City, Cairo",
    phones: [zahraaLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.0650, 31.3780),
    mapQuery: "30.0650,31.3780",
    lat: 30.0650,
    lng: 31.3780,
    mapZoom: 16,
    isPrimary: false,
    governorate: "Cairo",
    area: "مدينة نصر",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3452.9!2d31.3780!3d30.0650!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAzJzU0LjAiTiAzMcKwMjInNDAuOCJF!5e0!3m2!1sen!2seg!4v1",
  },
  {
    id: "zahraa-madinet-nasr",
    nameAr: "طريق فاطمة الزهراء",
    nameEn: "Fatma El-Zahraa Rd.",
    fullNameAr: "صيدليات المتحدة - مدينة نصر",
    fullNameEn: "United Pharmacies - Nasr City",
    addressAr: "طريق فاطمة الزهراء، الحي العاشر، مدينة نصر، القاهرة",
    addressEn: "Fatma El-Zahraa Rd, Al Hay Al Asher, Nasr City, Cairo",
    phones: [zahraaLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.0520, 31.3550),
    mapQuery: "30.0520,31.3550",
    lat: 30.0520,
    lng: 31.3550,
    mapZoom: 17,
    isPrimary: false,
    governorate: "Cairo",
    area: "مدينة نصر",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.3!2d31.3550!3d30.0520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDAzJzA3LjIiTiAzMcKwMjEnMTguMCJF!5e0!3m2!1sen!2seg!4v1",
  },
] satisfies readonly SiteLocation[];

export const deliveryLocations = locations.filter((location) => location.deliveryEnabled);
