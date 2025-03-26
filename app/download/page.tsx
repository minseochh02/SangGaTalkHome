import { Button } from "@/components/ui/button";
import { FaAndroid, FaDownload } from "react-icons/fa";

export default function DownloadPage() {
	const apkUrl =
		"https://github.com/minseochh02/sanggawalletapk/releases/download/v0.1.0-alpha/app-release.apk";

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
			<div className="w-full max-w-2xl text-center space-y-8">
				<h1 className="text-4xl font-bold">SanggaWallet 다운로드</h1>

				<div className="space-y-4">
					<div className="flex justify-center">
						<FaAndroid className="text-6xl text-[#3DDC84]" />
					</div>

					<p className="text-lg text-muted-foreground">
						안드로이드 기기에서 SanggaWallet을 설치하세요.
					</p>

					<Button size="lg" className="flex items-center gap-2" asChild>
						<a href={apkUrl} download>
							<FaDownload className="w-5 h-5" />
							APK 다운로드
						</a>
					</Button>

					<div className="mt-8 text-sm text-muted-foreground">
						<p>버전: v0.1.0-alpha</p>
						<p className="mt-2">
							* 알 수 없는 출처 앱 설치를 허용해야 할 수 있습니다.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
