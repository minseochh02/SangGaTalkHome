"use client";

import React from "react";
import MarkdownContent from "@/components/MarkdownContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyContent() {
  const privacyPolicyContent = `
# 개인정보처리방침

본 개인정보처리방침은 **(주)쿠스**(이하 "회사")가 운영하는 **SGT-Wallet Home**(이하 "SGT")이 제공하는 서비스 이용과 관련하여 이용자의 개인정보를 어떻게 수집, 이용, 보관, 파기하는지에 관한 정보를 안내합니다.

**회사 정보**
- 회사명: (주)쿠스
- 사업자등록번호: 731-81-02023
- 주소: 경기도 시흥시 서울대학로 59-69 배곧테크노밸리 609호 (우편번호: 15012)

## 고객 서비스 및 민원 처리

회사는 모든 거래에 대한 책임과 배송, 교환, 환불 민원등의 처리는 회사 고객센터에서 진행합니다.
자세한 문의는 email: quusai.space@gmail.com, 유선 : 070-4024-5884 으로 가능합니다.

## 1. 개인정보의 처리 목적

회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리한 개인정보는 다음의 목적 이외의 용도로는 사용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.

- 회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공, 회원자격 유지 및 관리, 서비스 부정이용 방지, 각종 고지 및 통지 등
- 서비스 제공: 상점 등록 및 관리, 상품 구매 및 결제, 상점 검색, 리뷰 작성, 포인트 적립 및 사용 등
- 마케팅 및 광고: 이벤트 정보 및 참여 기회 제공, 서비스 안내 및 이용권유, 맞춤형 정보 제공 등

## 2. 개인정보의 처리 및 보유 기간

회사는 법령에 따른 개인정보 보유 및 이용기간 또는 정보주체로부터 개인정보 수집 시 동의받은 개인정보 보유 및 이용기간 내에서 개인정보를 처리 및 보유합니다.

- 회원 가입 및 관리: 회원 탈퇴 시까지 (단, 다음의 사유에 해당하는 경우 해당 사유 종료 시까지)
  - 관계 법령 위반에 따른 수사, 조사 등이 진행중인 경우
  - 서비스 이용에 따른 채권, 채무관계 잔존 시
- 전자상거래 등에서의 소비자 보호에 관한 법률에 따른 보관:
  - 계약 또는 청약철회, 대금결제, 재화 등의 공급기록: 5년
  - 소비자 불만 또는 분쟁처리에 관한 기록: 3년
  - 표시·광고에 관한 기록: 6개월

## 3. 정보주체와 법정대리인의 권리·의무 및 행사방법

정보주체는 회사에 대해 언제든지 개인정보 열람, 정정, 삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다. 다만, 법령에서 정하는 바에 따라 이러한 권리가 제한될 수 있습니다.

- 권리 행사는 개인정보 보호법 시행령 제41조제1항에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있습니다.
- 만 14세 미만 아동의 경우, 법정대리인은 아동의 개인정보에 대한 열람, 정정, 삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다.

## 4. 처리하는 개인정보의 항목

회사는 다음과 같은 개인정보 항목을 처리하고 있습니다.

**필수항목**
- 회원가입: 이메일 주소, 비밀번호, 닉네임
- 상점 등록: 상점명, 주소, 연락처, 영업시간, 사업자등록번호

**선택항목**
- 회원가입: 프로필 이미지, 지역, 관심 카테고리
- 상점 등록: 상점 소개, 대표 이미지, 메뉴 정보, 홈페이지 URL, SNS 주소

## 5. 개인정보의 파기 절차 및 방법

회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.

**파기절차**
- 이용자가 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져 내부 방침 및 관련 법령에 따라 일정 기간 저장 후 파기됩니다.
- 별도 DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 다른 목적으로 이용되지 않습니다.

**파기방법**
- 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.
- 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.

## 6. 개인정보의 안전성 확보 조치

회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.

- 관리적 조치: 내부관리계획 수립 및 시행, 정기적 직원 교육 등
- 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치 및 갱신
- 물리적 조치: 전산실, 자료보관실 등의 접근통제

## 7. 개인정보 보호책임자 및 연락처

회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

**개인정보 보호책임자**
- 이름: 개인정보 보호책임자
- 직위: 담당자
- 연락처: privacy@koos.co.kr
- 주소: 경기도 시흥시 서울대학로 59-69 배곧테크노밸리 609호

개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.

## 8. 개인정보 처리방침 변경

이 개인정보 처리방침은 2024년 10월 22일부터 적용됩니다. 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.

## 9. 개인정보의 제3자 제공

회사는 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.

## 10. 개인정보 처리의 위탁

회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.

- 결제처리: 위탁업체명 기재
- 서버 호스팅: 위탁업체명 기재
- 이메일 발송: 위탁업체명 기재

## 11. 쿠키의 설치, 운영 및 그 거부에 관한 사항

회사는 이용자에게 맞춤화된 서비스를 제공하기 위해 '쿠키(cookie)'를 사용합니다. 쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에게 보내는 소량의 정보이며 이용자의 컴퓨터의 하드디스크에 저장됩니다.

이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
`;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Card className="bg-white shadow-md max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">개인정보처리방침</CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownContent content={privacyPolicyContent} />
        </CardContent>
      </Card>
    </div>
  );
} 