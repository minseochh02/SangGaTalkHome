"use client";

import { useEffect } from "react";

interface AddressPopupProps {
  onClose: () => void;
  onSelect: (address: string) => void;
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
      emdNo: string
    ) => void;
  }
}

export default function AddressPopup({ onClose, onSelect }: AddressPopupProps) {
  useEffect(() => {
    // Define the callback function that will be called by the popup
    window.jusoCallBack = (
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
      emdNo: string
    ) => {
      onSelect(roadFullAddr);
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
      `https://business.juso.go.kr/addrlink/addrLinkUrl.do?${params.toString()}`,
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