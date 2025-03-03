"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

declare global {
	interface Window {
		kakao: any;
	}
}

export function LocationStoresContent() {
	const [map, setMap] = useState<any>(null);
	const [showStoreList, setShowStoreList] = useState(false);
	const [stores, setStores] = useState([
		{
			id: 1,
			name: "테스트 매장 1",
			address: "서울시 강남구",
			lat: 37.498095,
			lng: 127.02761,
			category: "음식점",
		},
		{
			id: 2,
			name: "테스트 매장 2",
			address: "서울시 서초구",
			lat: 37.496587,
			lng: 127.024924,
			category: "카페",
		},
	]);

	useEffect(() => {
		const loadKakaoMap = () => {
			if (window.kakao && !map) {
				const container = document.getElementById("map");
				const options = {
					center: new window.kakao.maps.LatLng(37.498095, 127.02761),
					level: 3,
				};
				const kakaoMap = new window.kakao.maps.Map(container, options);
				setMap(kakaoMap);

				// Add markers for each store
				stores.forEach((store) => {
					const marker = new window.kakao.maps.Marker({
						position: new window.kakao.maps.LatLng(store.lat, store.lng),
					});

					// Add info window
					const infowindow = new window.kakao.maps.InfoWindow({
						content: `<div style="padding:5px;width:150px;">
              <strong>${store.name}</strong><br/>
              ${store.category}<br/>
              ${store.address}
            </div>`,
					});

					marker.setMap(kakaoMap);

					window.kakao.maps.event.addListener(marker, "click", function () {
						infowindow.open(kakaoMap, marker);
					});
				});
			}
		};

		loadKakaoMap();
	}, [map, stores]);

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-8">지역별 매장</h1>

			{/* Mobile toggle for store list */}
			<div className="lg:hidden mb-4">
				<button
					onClick={() => setShowStoreList(!showStoreList)}
					className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 rounded-lg"
				>
					<span>{showStoreList ? "지도 보기" : "매장 목록 보기"}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="6 9 12 15 18 9"></polyline>
					</svg>
				</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Map Container */}
				<div
					className={`${showStoreList ? "hidden" : "block"} lg:block lg:col-span-2 h-[400px] lg:h-[600px] rounded-lg overflow-hidden`}
				>
					<Script
						strategy="beforeInteractive"
						src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KAKAO_MAPS_API_KEY&autoload=false`}
					/>
					<div id="map" className="w-full h-full"></div>
				</div>

				{/* Store List */}
				<div
					className={`${showStoreList ? "block" : "hidden"} lg:block bg-card rounded-lg p-4`}
				>
					<div className="mb-4">
						<input
							type="text"
							placeholder="지역 검색"
							className="w-full px-4 py-2 rounded-md border border-input"
						/>
					</div>

					<div className="space-y-4">
						{stores.map((store) => (
							<div
								key={store.id}
								className="p-4 rounded-lg bg-background hover:bg-accent cursor-pointer"
							>
								<h3 className="font-semibold">{store.name}</h3>
								<p className="text-sm text-muted-foreground">
									{store.category}
								</p>
								<p className="text-sm">{store.address}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
