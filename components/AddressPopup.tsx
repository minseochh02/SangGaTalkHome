"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

interface AddressPopupProps {
  onClose: () => void;
  onSelect: (address: string, latitude?: string, longitude?: string) => void;
}

declare global {
  interface Window {
    jusoCallBack?: (
      roadFullAddr: string,
      roadAddrPart1: string,
      addrDetail: string,
      roadAddrPart2: string,
      engAddr: string,
      jibunAddr: string,
      zipNo: string,
      admCd: string,
      rnMgtSn: string,
      bdMgtSn: string,
      detBdNmList: string,
      bdNm: string,
      bdKdcd: string,
      siNm: string,
      sggNm: string,
      emdNm: string,
      liNm: string,
      rn: string,
      udrtYn: string,
      buldMnnm: string,
      buldSlno: string,
      mtYn: string,
      lnbrMnnm: string,
      lnbrSlno: string,
      emdNo: string,
      entX: string,
      entY: string
    ) => void;
    proj4: any;
  }
}

// Function to load proj4js dynamically
const loadProj4 = async (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window.proj4 !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.7.2/proj4.js';
    script.onload = () => resolve();
    script.onerror = () => {
      console.error("Failed to load proj4js library");
      resolve(); // Resolve anyway to prevent hanging
    };
    document.head.appendChild(script);
  });
};

// Function to convert coordinates using proj4js
const convertCoordinates = (entX: string, entY: string): { lat: string, lng: string } => {
  try {
    if (typeof window.proj4 === 'undefined') {
      throw new Error("proj4js not available");
    }

    // Convert coordinates from EPSG:5179 to WGS84 (EPSG:4326)
    // Round to 6 decimal places for precision
    const coordX = Math.round(parseFloat(entX) * 1000000) / 1000000;
    const coordY = Math.round(parseFloat(entY) * 1000000) / 1000000;
    const point = [coordX, coordY];
    
    // Define the coordinate systems
    window.proj4.defs["EPSG:5179"] = "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs";
    
    const grs80 = window.proj4.Proj(window.proj4.defs["EPSG:5179"]);
    const wgs84 = window.proj4.Proj(window.proj4.defs["EPSG:4326"]); // WGS84 (latitude/longitude)
    
    const p = window.proj4.toPoint(point);
    const transformed = window.proj4.transform(grs80, wgs84, p);
    
    return {
      lat: transformed.y.toString(),
      lng: transformed.x.toString()
    };
  } catch (error) {
    console.error("Error converting coordinates:", error);
    return { lat: "", lng: "" };
  }
};

export default function AddressPopup({ onClose, onSelect }: AddressPopupProps) {
  // Load proj4js when component mounts
  useEffect(() => {
    loadProj4();
  }, []);

  useEffect(() => {
    // Define the callback function that will be called by the popup
    window.jusoCallBack = async (
      roadFullAddr: string,
      roadAddrPart1: string,
      addrDetail: string,
      roadAddrPart2: string,
      engAddr: string,
      jibunAddr: string,
      zipNo: string,
      admCd: string,
      rnMgtSn: string,
      bdMgtSn: string,
      detBdNmList: string,
      bdNm: string,
      bdKdcd: string,
      siNm: string,
      sggNm: string,
      emdNm: string,
      liNm: string,
      rn: string,
      udrtYn: string,
      buldMnnm: string,
      buldSlno: string,
      mtYn: string,
      lnbrMnnm: string,
      lnbrSlno: string,
      emdNo: string,
      entX: string,
      entY: string
    ) => {
      // Make sure proj4js is loaded before trying to use it
      await loadProj4();
      
      const { lat, lng } = convertCoordinates(entX, entY);
      
      // If conversion failed, fall back to raw coordinates
      if (!lat || !lng) {
        console.error("Coordinate conversion failed. Falling back to raw coordinates.");
        onSelect(roadFullAddr, entY, entX);
      } else {
        onSelect(roadFullAddr, lat, lng);
      }
      
      onClose();
    };

    // Create a URL with query parameters - using absolute URL with https protocol
    // This ensures the Juso API can properly redirect back to our callback
    const callbackUrl = `${window.location.protocol}//${window.location.host}/api/juso/callback`;
    
    const params = new URLSearchParams({
      confmKey: process.env.NEXT_PUBLIC_JUSO_API || "",
      returnUrl: callbackUrl,
      resultType: "4", // JSON format for communication
      inputYn: "N",
      charset: "UTF-8", // Explicitly specify UTF-8 encoding
      encoding: "UTF-8"  // Additional encoding parameter
    });

    // Open the popup with GET request
    window.open(
      // `https://business.juso.go.kr/addrlink/addrLinkUrl.do?${params.toString()}`,
      `https://business.juso.go.kr/addrlink/addrCoordUrl.do?${params.toString()}`,
      "popup",
      "width=570,height=420,scrollbars=yes,resizable=yes"
    );

    return () => {
      // Clean up the callback when component unmounts
      delete window.jusoCallBack;
    };
  }, [onClose, onSelect]);

  return null;
} 