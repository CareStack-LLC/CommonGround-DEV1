'use client';

import { useState, useCallback } from 'react';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  isLoading: boolean;
  isSupported: boolean;
  getCurrentPosition: () => Promise<GeolocationPosition>;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,  // 15 seconds
  maximumAge: 0,   // Always get fresh position
};

/**
 * Hook for accessing device geolocation.
 *
 * Privacy: Only captures GPS when getCurrentPosition is explicitly called.
 * No continuous tracking or background location access.
 *
 * @example
 * const { position, error, isLoading, getCurrentPosition } = useGeolocation();
 *
 * const handleCheckIn = async () => {
 *   try {
 *     const pos = await getCurrentPosition();
 *     // Use pos.latitude, pos.longitude, pos.accuracy
 *   } catch (err) {
 *     // Handle error
 *   }
 * };
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = typeof window !== 'undefined' && 'geolocation' in navigator;

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        const err: GeolocationError = {
          code: 0,
          message: 'Geolocation is not supported by this browser',
        };
        setError(err);
        reject(err);
        return;
      }

      setIsLoading(true);
      setError(null);

      const mergedOptions = { ...defaultOptions, ...options };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPosition: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setPosition(geoPosition);
          setIsLoading(false);
          resolve(geoPosition);
        },
        (err) => {
          const geoError: GeolocationError = {
            code: err.code,
            message: getErrorMessage(err.code),
          };
          setError(geoError);
          setIsLoading(false);
          reject(geoError);
        },
        {
          enableHighAccuracy: mergedOptions.enableHighAccuracy,
          timeout: mergedOptions.timeout,
          maximumAge: mergedOptions.maximumAge,
        }
      );
    });
  }, [isSupported, options]);

  return {
    position,
    error,
    isLoading,
    isSupported,
    getCurrentPosition,
  };
}

/**
 * Convert geolocation error code to user-friendly message
 */
function getErrorMessage(code: number): string {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return 'Location access denied. Please enable location permissions in your browser settings.';
    case 2: // POSITION_UNAVAILABLE
      return 'Location unavailable. Please check your device\'s GPS or location services.';
    case 3: // TIMEOUT
      return 'Location request timed out. Please try again.';
    default:
      return 'An unknown error occurred while getting your location.';
  }
}

export default useGeolocation;
