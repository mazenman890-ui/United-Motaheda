import { PrismaClient } from "@prisma/client";

type Coordinates = { lat: number; lng: number };

function bboxPolygon(box: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  return {
    points: [
      { lat: box.minLat, lng: box.minLng },
      { lat: box.minLat, lng: box.maxLng },
      { lat: box.maxLat, lng: box.maxLng },
      { lat: box.maxLat, lng: box.minLng },
    ],
  };
}

function expandBox(
  box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  delta: { lat: number; lng: number },
) {
  return {
    minLat: box.minLat - delta.lat,
    maxLat: box.maxLat + delta.lat,
    minLng: box.minLng - delta.lng,
    maxLng: box.maxLng + delta.lng,
  };
}

async function main() {
  const prisma = new PrismaClient();

  /**
   * Delivery zone polygons
   * Notes:
   * - These are *real* GPS coordinates outlining practical delivery boundaries
   *   for each branch area in Greater Cairo.
   * - Stored as { points: [{lat,lng}, ...] } (implicitly closed).
   */
  const zoneByBranchId: Record<string, { points: Coordinates[] }> = {
    // Branch 1: Nasr City (Al Hay Al Asher / Fatma El-Zahraa Rd)
    "zahraa-madinet-nasr": {
      points: [
        { lat: 30.08, lng: 31.39 },
        { lat: 30.08, lng: 31.35 },
        { lat: 30.06, lng: 31.335 },
        { lat: 30.03, lng: 31.345 },
        { lat: 30.025, lng: 31.38 },
        { lat: 30.04, lng: 31.405 },
        { lat: 30.07, lng: 31.4 },
      ],
    },

    // Branch 2: Gardenia City (New Cairo)
    gardenia: {
      points: [
        { lat: 30.125, lng: 31.415 },
        { lat: 30.125, lng: 31.365 },
        { lat: 30.105, lng: 31.35 },
        { lat: 30.07, lng: 31.36 },
        { lat: 30.065, lng: 31.41 },
        { lat: 30.085, lng: 31.43 },
        { lat: 30.11, lng: 31.425 },
      ],
    },

    // Branch 3: Nasr City - Al Ahly Club
    "nasr-city-ahly": {
      points: [
        { lat: 30.085, lng: 31.335 },
        { lat: 30.085, lng: 31.295 },
        { lat: 30.065, lng: 31.285 },
        { lat: 30.04, lng: 31.295 },
        { lat: 30.035, lng: 31.325 },
        { lat: 30.05, lng: 31.345 },
        { lat: 30.075, lng: 31.345 },
      ],
    },

    // Branch 4: Maadi (Palestine Rd / El-Basatin Sharkeya)
    maadi: {
      points: [
        { lat: 30.04, lng: 31.305 },
        { lat: 30.04, lng: 31.255 },
        { lat: 30.02, lng: 31.24 },
        { lat: 29.985, lng: 31.25 },
        { lat: 29.98, lng: 31.295 },
        { lat: 30.0, lng: 31.32 },
        { lat: 30.025, lng: 31.315 },
      ],
    },

    // Branch 5: Agouza (19 El-Hady / Madinet Al Eelam)
    agouza: {
      points: [
        { lat: 30.08, lng: 31.245 },
        { lat: 30.08, lng: 31.2 },
        { lat: 30.06, lng: 31.185 },
        { lat: 30.04, lng: 31.19 },
        { lat: 30.03, lng: 31.22 },
        { lat: 30.04, lng: 31.25 },
        { lat: 30.065, lng: 31.255 },
      ],
    },
  };

  const branches = [
    {
      id: "zahraa-madinet-nasr",
      nameAr: "مدينة نصر",
      nameEn: "Nasr City Branch",
      governorate: "Cairo",
      area: "Nasr City",
      address: "Al Hay Al Asher, Fatma El-Zahraa Rd.",
      lat: 30.051938,
      lng: 31.370845,
      mapEmbedSrc:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583d8434c8d905%3A0x151767fe195e0972!2z2LXZitiv2YTZitin2Kog2KfZhNmF2KrYrdiv2KlVbml0ZWQgcGhhcm1hY2llcw!5e0!3m2!1sen!2seg!4v1778053374637!5m2!1sen!2seg",
      isActive: true,
    },
    {
      id: "gardenia",
      nameAr: "جاردينيا سيتي",
      nameEn: "Gardenia City Branch",
      governorate: "Cairo",
      area: "New Cairo",
      address: "Compound, Gardenia City Mall.",
      lat: 30.09425068190479,
      lng: 31.39227686643197,
      mapEmbedSrc:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583decf6dfa0f9%3A0xfaa584f03ea1b98!2z2LXZitiv2YTZitipINin2YTZhdiq2K3Yr9ipIFVuaXRlZCBQaGFybWFjeQ!5e0!3m2!1sen!2seg!4v1778053802604!5m2!1sen!2seg",
      isActive: true,
    },
    {
      id: "nasr-city-ahly",
      nameAr: "مدينة نصر - النادي الأهلي",
      nameEn: "Nasr City (Al Ahly Club) Branch",
      governorate: "Cairo",
      area: "Nasr City",
      address: "Mahmoud Abd El-Moneim.",
      lat: 30.0595,
      lng: 31.317,
      mapEmbedSrc:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110516.18800725466!2d31.29585114420823!3d30.04744600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583de71a246875%3A0xf4ba68adafbe8a39!2z2KfZhNmF2KrYrdiv2Ycg2YTZhNi12YrYp9iv2YTZhyDZgdix2Lkg2YXYr9mK2YbZhyDZhti12LE!5e0!3m2!1sen!2seg!4v1778053949752!5m2!1sen!2seg",
      isActive: true,
    },
    {
      id: "maadi",
      nameAr: "المعادي",
      nameEn: "Maadi Branch",
      governorate: "Cairo",
      area: "Maadi",
      address: "1 Palestine Rd, El-Basatin Sharkeya.",
      lat: 30.014611006252824,
      lng: 31.282413586197983,
      mapEmbedSrc:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110594.01878468209!2d31.131900097265614!3d29.977616899999983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1458390022101dbb%3A0xffb55dd6aa99f637!2z2LXZitiv2YTZitipINin2YTZhdiq2K3Yr9ip!5e0!3m2!1sen!2seg!4v1778053994321!5m2!1sen!2seg",
      isActive: true,
    },
    {
      id: "agouza",
      nameAr: "العجوزة",
      nameEn: "Agouza Branch",
      governorate: "Cairo",
      area: "Agouza",
      address: "19 El-Hady, Madinet Al Eelam.",
      lat: 30.0565,
      lng: 31.2196,
      mapEmbedSrc:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110493.43089370785!2d31.201497300000003!3d30.0678357!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14584116ce4c41b3%3A0x705cc87d7fa65d3e!2z2KfZhNi02LHZg9ipINin2YTZhdiq2K3Yr9ipINmE2YTYtdmK2KfYr9mE2Kkg2YHYsdi5INin2YTZhdmH2YbYr9iz2YrZhg!5e0!3m2!1sen!2seg!4v1778054490145!5m2!1sen!2seg",
      isActive: true,
    },
  ] as const;

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      create: branch,
      update: branch,
    });

    await prisma.deliveryZone.upsert({
      where: { id: `${branch.id}-zone-1` },
      create: {
        id: `${branch.id}-zone-1`,
        branchId: branch.id,
        name: "Primary Zone",
        polygon: zoneByBranchId[branch.id] ?? bboxPolygon(expandBox({
          minLat: branch.lat,
          maxLat: branch.lat,
          minLng: branch.lng,
          maxLng: branch.lng,
        }, { lat: 0.02, lng: 0.02 })),
        baseFee: 25,
        freeAboveSubtotal: 500,
        surgeStartHour: 0,
        surgeEndHour: 6,
        surgeMultiplier: 1.25,
      },
      update: {
        polygon: zoneByBranchId[branch.id] ?? bboxPolygon(expandBox({
          minLat: branch.lat,
          maxLat: branch.lat,
          minLng: branch.lng,
          maxLng: branch.lng,
        }, { lat: 0.02, lng: 0.02 })),
        baseFee: 25,
        freeAboveSubtotal: 500,
        surgeStartHour: 0,
        surgeEndHour: 6,
        surgeMultiplier: 1.25,
      },
    });
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
