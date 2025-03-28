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
    window.jusoCallBack = function(
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
    ) {
      console.log('Address callback received:', roadFullAddr);
      onSelect(roadFullAddr);
      onClose();
    };

    // Create a form element to submit a POST request
    const form = document.createElement("form");
    form.setAttribute("method", "post");
    form.setAttribute("action", "https://business.juso.go.kr/addrlink/addrLinkUrl.do");
    form.setAttribute("target", "popup");
    
    // Add parameters as hidden inputs
    const params = {
      confmKey: "devU01TX0FVVEgyMDI1MDMyODEyMjUwMzExNTU4ODY=",
      returnUrl: "javascript:window.parent.jusoCallBack",
      resultType: "4",
      inputYn: "N",
      function: "jusoCallBack"
    };
    
    for (const [key, value] of Object.entries(params)) {
      const input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("name", key);
      input.setAttribute("value", value as string);
      form.appendChild(input);
    }
    
    // Append form to body
    document.body.appendChild(form);
    
    // Open popup window first
    const popup = window.open("", "popup", "width=570,height=420,scrollbars=yes,resizable=yes");
    
    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert("팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.");
      document.body.removeChild(form);
      onClose();
      return;
    }
    
    // Submit the form
    form.submit();
    
    // Remove the form
    document.body.removeChild(form);

    return () => {
      // Clean up the callback when component unmounts
      delete window.jusoCallBack;
    };
  }, [onClose, onSelect]);

  return null;
} 