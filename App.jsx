import { useEffect, useState } from "react"
import { PortOnePayment } from "./PortOnePayment"

export function App() {
  const [item, setItem] = useState(null)

  useEffect(() => {
    async function loadItem() {
      const response = await fetch("/api/item")
      setItem(await response.json())
    }

    loadItem().catch((error) => console.error(error))
  }, [])

  if (item == null) {
    return (
      <dialog open>
        <article aria-busy>결제 정보를 불러오는 중입니다.</article>
      </dialog>
    )
  }

  return (
    <main>
      <form>
        <article>
          <div className="item">
            <div className="item-image">
              <img src={`/${item.id}.png`} />
            </div>
            <div className="item-text">
              <h5>{item.name}</h5>
              <p>{item.price.toLocaleString()}원</p>
            </div>
          </div>
          <div className="price">
            <label>총 구입 가격</label>
            {item.price.toLocaleString()}원
          </div>
        </article>
        
        <PortOnePayment
          storeId="store-e4038486-8d83-41a5-acf1-844a009e0d94"
          channelKey="channel-key-01764171-b249-4c16-9d18-e9174fa8e611"
          orderName={item.name}
          totalAmount={item.price}
          currency={item.currency}
          customData={{ item: item.id }}
          buttonText="결제"
        />
      </form>
    </main>
  )
} 