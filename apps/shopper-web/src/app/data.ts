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
    nameAr: "جاردينيا",
    nameEn: "Gardenia City Branch",
    fullNameAr: "صيدليات المتحدة - جاردينيا",
    fullNameEn: "United Pharmacies - Gardenia City",
    addressAr: "مول جاردينيا سيتي، القاهرة الجديدة، محافظة القاهرة 11511",
    addressEn: "Gardenia City Mall, New Cairo, Cairo Governorate 11511",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.09425068190479, 31.39227686643197),
    mapQuery: "30.09425068190479,31.39227686643197",
    lat: 30.09425068190479,
    lng: 31.39227686643197,
    mapZoom: 16,
    isPrimary: true,
    governorate: "Cairo",
    area: "New Cairo",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583decf6dfa0f9%3A0xfaa584f03ea1b98!2z2LXZitiv2YTZitipINin2YTZhdiq2K3Yr9ipIFVuaXRlZCBQaGFybWFjeQ!5e0!3m2!1sen!2seg!4v1778053802604!5m2!1sen!2seg",
  },
  {
    id: "zahraa-madinet-nasr",
    nameAr: "مدينة نصر",
    nameEn: "Nasr City Branch",
    fullNameAr: "صيدليات المتحدة - مدينة نصر",
    fullNameEn: "United Pharmacies - Nasr City",
    addressAr: "الحي العاشر، طريق فاطمة الزهراء، مدينة نصر، القاهرة",
    addressEn: "Al Hay Al Asher, Fatma El-Zahraa Rd, Nasr City, Cairo",
    phones: [zahraaLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.051938, 31.370845),
    mapQuery: "30.051938,31.370845",
    lat: 30.051938,
    lng: 31.370845,
    mapZoom: 17,
    isPrimary: false,
    governorate: "Cairo",
    area: "Nasr City",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583d8434c8d905%3A0x151767fe195e0972!2z2LXZitiv2YTZitin2Kog2KfZhNmF2KrYrdiv2KlVbml0ZWQgcGhhcm1hY2llcw!5e0!3m2!1sen!2seg!4v1778053374637!5m2!1sen!2seg",
  },
  {
    id: "maadi",
    nameAr: "شارع فلسطين",
    nameEn: "Palestine Street Branch",
    fullNameAr: "صيدليات المتحدة - شارع فلسطين",
    fullNameEn: "United Pharmacies - Palestine Street",
    addressAr: "1 شارع فلسطين، البساتين الشرقية، قسم المعادي، محافظة القاهرة 4234320",
    addressEn: "1 Palestine Street, El-Basatin El-Sharqeya, Maadi District, Cairo Governorate 4234320",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.014611006252824, 31.282413586197983),
    mapQuery: "30.014611006252824,31.282413586197983",
    lat: 30.014611006252824,
    lng: 31.282413586197983,
    mapZoom: 17,
    isPrimary: false,
    governorate: "Cairo",
    area: "Maadi",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110594.01878468209!2d31.131900097265614!3d29.977616899999983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1458390022101dbb%3A0xffb55dd6aa99f637!2z2LXZitiv2YTZitipINin2YTZhdiq2K3Yr9ip!5e0!3m2!1sen!2seg!4v1778053994321!5m2!1sen!2seg",
  },
  {
    id: "heliopolis",
    nameAr: "مصر الجديدة",
    nameEn: "Heliopolis Branch",
    fullNameAr: "صيدليات المتحدة - مصر الجديدة",
    fullNameEn: "United Pharmacies - Heliopolis",
    addressAr: "شارع النزهة، بالقرب من ميدان سانت فاتيما، مصر الجديدة، القاهرة",
    addressEn: "El Nozha Street, near Saint Fatima Square, Heliopolis, Cairo",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.090317, 31.33486),
    mapQuery: "30.090317,31.33486",
    lat: 30.090317,
    lng: 31.33486,
    mapZoom: 16,
    isPrimary: false,
    governorate: "Cairo",
    area: "Heliopolis",
    deliveryEnabled: false,
  },
  {
    id: "fifth-settlement",
    nameAr: "التجمع الخامس",
    nameEn: "Fifth Settlement Branch",
    fullNameAr: "صيدليات المتحدة - التجمع الخامس",
    fullNameEn: "United Pharmacies - Fifth Settlement",
    addressAr: "القاهرة الجديدة، بالقرب من شارع التسعين الشمالي، التجمع الخامس",
    addressEn: "New Cairo, near North 90 Street, Fifth Settlement",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.028879, 31.478642),
    mapQuery: "30.028879,31.478642",
    lat: 30.028879,
    lng: 31.478642,
    mapZoom: 16,
    isPrimary: false,
    governorate: "Cairo",
    area: "New Cairo",
    deliveryEnabled: false,
  },
  {
    id: "mokattam",
    nameAr: "المقطم",
    nameEn: "Mokattam Branch",
    fullNameAr: "صيدليات المتحدة - المقطم",
    fullNameEn: "United Pharmacies - Mokattam",
    addressAr: "الهضبة الوسطى، بالقرب من شارع 9، المقطم، القاهرة",
    addressEn: "Middle Plateau, near Street 9, Mokattam, Cairo",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.008987, 31.315934),
    mapQuery: "30.008987,31.315934",
    lat: 30.008987,
    lng: 31.315934,
    mapZoom: 16,
    isPrimary: false,
    governorate: "Cairo",
    area: "Mokattam",
    deliveryEnabled: false,
  },
  {
    id: "nasr-city-ahly",
    nameAr: "مدينة نصر - النادي الأهلي",
    nameEn: "Nasr City (Al Ahly Club) Branch",
    fullNameAr: "صيدليات المتحدة - مدينة نصر (النادي الأهلي)",
    fullNameEn: "United Pharmacies - Nasr City (Al Ahly Club)",
    addressAr: "محمود عبد المنعم، مدينة نصر - بالقرب من النادي الأهلي، القاهرة",
    addressEn: "Mahmoud Abd El-Moneim, Nasr City (near Al Ahly Club), Cairo",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.0595, 31.317),
    mapQuery: "30.0595,31.317",
    lat: 30.0595,
    lng: 31.317,
    mapZoom: 16,
    isPrimary: false,
    governorate: "Cairo",
    area: "Nasr City",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583de71a246875%3A0xf4ba68adafbe8a39!2z2KfZhNmF2KrYrdiv2Ycg2YTZhNi12YrYp9iv2YTZhyDZgdix2Lkg2YXYr9mK2YbZhyDZhti12LE!5e0!3m2!1sen!2seg!4v1778053949752!5m2!1sen!2seg",
  },
  {
    id: "agouza",
    nameAr: "العجوزة",
    nameEn: "Agouza Branch",
    fullNameAr: "صيدليات المتحدة - العجوزة",
    fullNameEn: "United Pharmacies - Agouza",
    addressAr: "19 شارع الهادي، مدينة الإعلام، العجوزة",
    addressEn: "19 El-Hady St, Madinet Al Eelam, Agouza",
    phones: [supportLine, whatsappSupportLine],
    hoursAr: sharedBranchHoursAr,
    hoursEn: sharedBranchHoursEn,
    mapsDirectionsUrl: buildBranchDirectionsUrl(30.0565, 31.2196),
    mapQuery: "30.0565,31.2196",
    lat: 30.0565,
    lng: 31.2196,
    mapZoom: 16,
    isPrimary: false,
    governorate: "Cairo",
    area: "Agouza",
    deliveryEnabled: true,
    mapEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110493.43089370785!2d31.201497300000003!3d30.0678357!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14584116ce4c41b3%3A0x705cc87d7fa65d3e!2z2KfZhNi02LHZg9ipINin2YTZhdiq2K3Yr9ipINmE2YTYtdmK2KfYr9mE2Kkg2YHYsdi5INin2YTZhdmH2YbYr9iz2YrZhg!5e0!3m2!1sen!2seg!4v1778054490145!5m2!1sen!2seg",
  },
] satisfies readonly SiteLocation[];

export const deliveryLocations = locations.filter((location) => location.deliveryEnabled);
