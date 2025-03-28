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

    // Create and submit the form to open the address popup
    const form = document.createElement("form");
    form.method = "post";
    form.action = "https://business.juso.go.kr/addrlink/addrLinkUrl.do";

    const confmKey = document.createElement("input");
    confmKey.type = "hidden";
    confmKey.name = "confmKey";
    confmKey.value = "devU01TX0FVVEgyMDI1MDMyODEyMjUwMzExNTU4ODY=";

    const returnUrl = document.createElement("input");
    returnUrl.type = "hidden";
    returnUrl.name = "returnUrl";
    returnUrl.value = window.location.href;

    const resultType = document.createElement("input");
    resultType.type = "hidden";
    resultType.name = "resultType";
    resultType.value = "4";

    form.appendChild(confmKey);
    form.appendChild(returnUrl);
    form.appendChild(resultType);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    return () => {
      // Clean up the callback when component unmounts
      delete window.jusoCallBack;
    };
  }, [onClose, onSelect]);

  return null;
} 