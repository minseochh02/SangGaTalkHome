import Link from "next/link";

export default function Footer() {
	return (
		<footer className="w-full flex items-center justify-center border-t border-t-foreground/10 py-16">
			<div className="max-w-7xl w-full flex flex-col items-center px-5 text-sm gap-4">
				<div className="flex flex-col md:flex-row justify-between w-full items-center gap-4">
					<p>© 2024 (주)쿠스. All rights reserved.</p>
					<div className="flex gap-4">
						<Link href="/privacy" className="hover:text-primary">
							개인정보처리방침
						</Link>
						<Link href="/terms" className="hover:text-primary">
						이용약관
						</Link>
						<Link href="/return-policy" className="hover:text-primary">
						반품/교환/환불 정책
						</Link>
					</div>
				</div>
				<div className="text-xs text-gray-500 text-center mt-2">
					<p>상호명: (주)쿠스</p>
					<p>사업자등록번호: 731-81-02023</p>
					<p>대표자명: 차민수</p>
					<p>주소: 경기도 시흥시 서울대학로 59-69 배곧테크노밸리 609호 (우편번호: 15012)</p>
					<p>대표전화: 070-4024-5884</p>
					<p>통신판매업번호: 제2025-서울시-0000호</p>
					<p className="mt-4">
						(주)쿠스 당사는 모든 거래에 대한 책임과 배송, 교환, 환불 민원등의 처리는
						가맹점에서 진행합니다.
						<br />
						자세한 문의는 email: quusai.space@gmail.com, 유선 : 070-4024-5884
						으로 가능합니다.
					</p>
					{/* 상호명, 사업자등록번호, 대표자명, 사업장주소지, 전화번호(휴대폰번호 불가) */}
					{/* 07040245884 */}
					{/* 통신판매업번호 */}
				</div>
			</div>
		</footer>
	);
}
