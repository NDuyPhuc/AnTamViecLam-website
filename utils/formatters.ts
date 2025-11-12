import { Job } from '../types';

export const formatCurrency = (value: number | string) => {
    if (typeof value === 'string') return value;
    try {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    } catch (e) {
        return `${value} VNĐ`;
    }
};

export const formatPay = (payRate: Job['payRate'], payType: Job['payType']) => {
    if (payRate === 'Thỏa thuận') {
        return 'Thỏa thuận';
    }
    const rate = formatCurrency(payRate);
    switch(payType) {
        case 'THEO GIỜ': return `${rate}/giờ`;
        case 'THEO NGÀY': return `${rate}/ngày`;
        case 'THEO THÁNG': return `${rate}/tháng`;
        default: return rate;
    }
};

export const parseLocationString = (locationStr: string): { lat: number; lng: number } | null => {
    if (!locationStr || typeof locationStr !== 'string') return null;
    try {
        // More robust regex to handle potential whitespace inconsistencies.
        // Matches patterns like "[ 10.123° N,  106.456° E ]"
        const matches = locationStr.match(/\[\s*(-?\d+\.?\d*)\s*°\s*N,\s*(-?\d+\.?\d*)\s*°\s*E\s*\]/);
        if (matches && matches.length === 3) {
            const lat = parseFloat(matches[1]);
            const lng = parseFloat(matches[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng };
            }
        }
        return null;
    } catch (e) {
        console.error("Error parsing location string:", locationStr, e);
        return null;
    }
};

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * @param lat1 Latitude of the first point.
 * @param lon1 Longitude of the first point.
 * @param lat2 Latitude of the second point.
 * @param lon2 Longitude of the second point.
 * @returns The distance in kilometers.
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

export const formatTimeAgo = (dateString: string, context: 'post' | 'presence' = 'post'): string => {
  const now = new Date();
  const past = new Date(dateString);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 5) {
      return context === 'presence' ? 'vài giây trước' : 'vừa xong';
  }
  if (seconds < 60) {
    return `${seconds} giây trước`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} phút trước`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} giờ trước`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'hôm qua';
  }
  if (days < 7) {
    return `${days} ngày trước`;
  }
  
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(past);
};