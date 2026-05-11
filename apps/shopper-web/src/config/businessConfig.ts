/**
 * BUSINESS CONFIGURATION - Dynamic Business Logic
 * 
 * Replaces hardcoded values with dynamic configuration system
 * Supports multi-branch operations and dynamic pricing
 */

export interface Branch {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  addressEn: string;
  city: string;
  cityEn: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  email: string;
  operatingHours: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  deliveryZones: DeliveryZone[];
  isMain: boolean;
  isActive: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  nameEn: string;
  polygon: [number, number][]; // GPS coordinates for delivery area
  baseFee: number;
  feePerKm: number;
  maxDeliveryTime: number; // minutes
  minOrderAmount: number;
  freeDeliveryThreshold: number;
}

export interface DeliveryPricing {
  baseFee: number;
  feePerKm: number;
  nightSurcharge: number; // percentage
  weatherSurcharge: number; // percentage
  freeDeliveryThreshold: number;
  minOrderAmount: number;
  expressDeliveryFee: number;
  scheduledDeliveryDiscount: number; // percentage
}

export interface DeliveryTimeEstimate {
  standard: { min: number; max: number }; // minutes
  express: { min: number; max: number }; // minutes
  scheduled: { min: number; max: number }; // minutes
  peakHoursSurcharge: number; // percentage
}

// ==========================================
// DEFAULT CONFIGURATION
// ==========================================

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: "cairo-downtown",
    name: "القاهرة - وسط البلد",
    nameEn: "Cairo - Downtown",
    address: "شارع التحرير، وسط البلد، القاهرة",
    addressEn: "Tahrir Street, Downtown, Cairo",
    city: "القاهرة",
    cityEn: "Cairo",
    coordinates: { lat: 30.0444, lng: 31.2357 },
    phone: "+20-2-12345678",
    email: "downtown@unitedpharmacy.com",
    isMain: true,
    isActive: true,
    operatingHours: {
      sunday: { open: "08:00", close: "23:00" },
      monday: { open: "08:00", close: "23:00" },
      tuesday: { open: "08:00", close: "23:00" },
      wednesday: { open: "08:00", close: "23:00" },
      thursday: { open: "08:00", close: "23:00" },
      friday: { open: "09:00", close: "22:00" },
      saturday: { open: "08:00", close: "23:00" },
    },
    deliveryZones: [
      {
        id: "downtown-cairo",
        name: "وسط البلد",
        nameEn: "Downtown Cairo",
        polygon: [
          [30.0400, 31.2300],
          [30.0500, 31.2300],
          [30.0500, 31.2400],
          [30.0400, 31.2400],
        ],
        baseFee: 15,
        feePerKm: 3,
        maxDeliveryTime: 45,
        minOrderAmount: 50,
        freeDeliveryThreshold: 200,
      },
      {
        id: "nasr-city",
        name: "مدينة نصر",
        nameEn: "Nasr City",
        polygon: [
          [30.0600, 31.3200],
          [30.0700, 31.3200],
          [30.0700, 31.3300],
          [30.0600, 31.3300],
        ],
        baseFee: 20,
        feePerKm: 4,
        maxDeliveryTime: 60,
        minOrderAmount: 75,
        freeDeliveryThreshold: 250,
      },
    ],
  },
  {
    id: "giza-pyramids",
    name: "الجيزة - الأهرام",
    nameEn: "Giza - Pyramids",
    address: "شارع الأهرام، الجيزة",
    addressEn: "Pyramids Street, Giza",
    city: "الجيزة",
    cityEn: "Giza",
    coordinates: { lat: 29.9792, lng: 31.1342 },
    phone: "+20-2-87654321",
    email: "pyramids@unitedpharmacy.com",
    isMain: false,
    isActive: true,
    operatingHours: {
      sunday: { open: "08:00", close: "22:30" },
      monday: { open: "08:00", close: "22:30" },
      tuesday: { open: "08:00", close: "22:30" },
      wednesday: { open: "08:00", close: "22:30" },
      thursday: { open: "08:00", close: "22:30" },
      friday: { open: "09:00", close: "21:00" },
      saturday: { open: "08:00", close: "22:30" },
    },
    deliveryZones: [
      {
        id: "giza-center",
        name: "وسط الجيزة",
        nameEn: "Central Giza",
        polygon: [
          [29.9700, 31.1300],
          [29.9900, 31.1300],
          [29.9900, 31.1400],
          [29.9700, 31.1400],
        ],
        baseFee: 12,
        feePerKm: 2.5,
        maxDeliveryTime: 40,
        minOrderAmount: 40,
        freeDeliveryThreshold: 180,
      },
    ],
  },
];

export const DEFAULT_DELIVERY_PRICING: DeliveryPricing = {
  baseFee: 15,
  feePerKm: 3,
  nightSurcharge: 20, // 20% extra for night deliveries (8 PM - 6 AM)
  weatherSurcharge: 15, // 15% extra for bad weather
  freeDeliveryThreshold: 200,
  minOrderAmount: 50,
  expressDeliveryFee: 25,
  scheduledDeliveryDiscount: 10, // 10% discount for scheduled orders
};

export const DEFAULT_DELIVERY_TIMES: DeliveryTimeEstimate = {
  standard: { min: 30, max: 60 },
  express: { min: 15, max: 30 },
  scheduled: { min: 45, max: 90 },
  peakHoursSurcharge: 25, // 25% extra during peak hours (12-2 PM, 6-8 PM)
};

// ==========================================
// CONFIGURATION HOOKS
// ==========================================

import { useState, useEffect } from "react";

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In a real app, this would fetch from your API
  const refreshBranches = async () => {
    setLoading(true);
    try {
      // const response = await fetch('/api/branches');
      // const data = await response.json();
      // setBranches(data);
      setBranches(DEFAULT_BRANCHES);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshBranches();
  }, []);

  return {
    branches,
    loading,
    error,
    refreshBranches,
    activeBranches: branches.filter(b => b.isActive),
    mainBranch: branches.find(b => b.isMain),
  };
}

export function useDeliveryPricing() {
  const [pricing, setPricing] = useState<DeliveryPricing>(DEFAULT_DELIVERY_PRICING);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In a real app, this would fetch from your API
  const refreshPricing = async () => {
    setLoading(true);
    try {
      // const response = await fetch('/api/delivery-pricing');
      // const data = await response.json();
      // setPricing(data);
      setPricing(DEFAULT_DELIVERY_PRICING);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPricing();
  }, []);

  return {
    pricing,
    loading,
    error,
    refreshPricing,
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function calculateDeliveryFee(
  branch: Branch,
  customerCoordinates: { lat: number; lng: number },
  orderAmount: number,
  deliveryType: 'standard' | 'express' | 'scheduled' = 'standard',
  pricing: DeliveryPricing = DEFAULT_DELIVERY_PRICING
): { fee: number; estimatedTime: number; zone?: DeliveryZone } {
  // Find delivery zone
  const zone = findDeliveryZone(branch, customerCoordinates);
  
  if (!zone) {
    throw new Error('Delivery not available in this area');
  }

  // Calculate distance (simplified - use proper distance calculation in production)
  const distance = calculateDistance(
    branch.coordinates,
    customerCoordinates
  );

  // Base fee calculation
  let fee = zone.baseFee + (distance * zone.feePerKm);

  // Apply delivery type adjustments
  if (deliveryType === 'express') {
    fee += pricing.expressDeliveryFee;
  } else if (deliveryType === 'scheduled') {
    fee *= (1 - pricing.scheduledDeliveryDiscount / 100);
  }

  // Apply time-based surcharges
  const now = new Date();
  const hour = now.getHours();
  
  // Night surcharge (8 PM - 6 AM)
  if (hour >= 20 || hour < 6) {
    fee *= (1 + pricing.nightSurcharge / 100);
  }

  // Peak hours surcharge (12-2 PM, 6-8 PM)
  if ((hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20)) {
    fee *= (1 + DEFAULT_DELIVERY_TIMES.peakHoursSurcharge / 100);
  }

  // Free delivery for large orders
  if (orderAmount >= zone.freeDeliveryThreshold) {
    fee = 0;
  }

  // Minimum order check
  if (orderAmount < zone.minOrderAmount) {
    throw new Error(`Minimum order amount is ${zone.minOrderAmount} EGP`);
  }

  const estimatedTime = calculateEstimatedTime(
    distance,
    deliveryType,
    hour,
    zone.maxDeliveryTime
  );

  return { fee, estimatedTime, zone };
}

function findDeliveryZone(
  branch: Branch,
  coordinates: { lat: number; lng: number }
): DeliveryZone | undefined {
  // Simplified zone detection - use proper point-in-polygon algorithm in production
  return branch.deliveryZones.find(zone => {
    const centerLat = zone.polygon.reduce((sum, p) => sum + p[0], 0) / zone.polygon.length;
    const centerLng = zone.polygon.reduce((sum, p) => sum + p[1], 0) / zone.polygon.length;
    const distance = calculateDistance(
      { lat: centerLat, lng: centerLng },
      coordinates
    );
    return distance < 0.1; // 10km radius (simplified)
  });
}

function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  // Simplified distance calculation - use Haversine formula in production
  const latDiff = Math.abs(point1.lat - point2.lat);
  const lngDiff = Math.abs(point1.lng - point2.lng);
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough km conversion
}

function calculateEstimatedTime(
  distance: number,
  deliveryType: 'standard' | 'express' | 'scheduled',
  hour: number,
  maxTime: number
): number {
  const times = DEFAULT_DELIVERY_TIMES[deliveryType];
  let baseTime = (times.min + times.max) / 2;

  // Adjust for distance
  baseTime += distance * 5; // 5 minutes per km

  // Adjust for traffic (peak hours)
  if ((hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20)) {
    baseTime *= 1.5;
  }

  // Don't exceed maximum time
  return Math.min(baseTime, maxTime);
}

export function formatDeliveryTime(minutes: number, lang: 'ar' | 'en'): string {
  if (minutes < 60) {
    return lang === 'ar' 
      ? `${Math.round(minutes)} دقيقة` 
      : `${Math.round(minutes)} minutes`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (lang === 'ar') {
    return `${hours} ساعة${remainingMinutes > 0 ? ` و ${Math.round(remainingMinutes)} دقيقة` : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${Math.round(remainingMinutes)} min` : ''}`;
  }
}

export function formatCurrency(amount: number, lang: 'ar' | 'en'): string {
  const formatted = amount.toFixed(2);
  return lang === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}
