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

    // Create a URL with query parameters
    const params = new URLSearchParams({
      confmKey: "devU01TX0FVVEgyMDI1MDMyODEyMjUwMzExNTU4ODY=",
      returnUrl: window.location.href,
      resultType: "4",
      inputYn: "N"
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