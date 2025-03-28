import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  // Extract the data from the Juso API callback
  const roadFullAddr = params.get('roadFullAddr') || '';
  const roadAddrPart1 = params.get('roadAddrPart1') || '';
  const addrDetail = params.get('addrDetail') || '';
  const roadAddrPart2 = params.get('roadAddrPart2') || '';
  const engAddr = params.get('engAddr') || '';
  const jibunAddr = params.get('jibunAddr') || '';
  const zipNo = params.get('zipNo') || '';
  const admCd = params.get('admCd') || '';
  const rnMgtSn = params.get('rnMgtSn') || '';
  const bdMgtSn = params.get('bdMgtSn') || '';
  const detBdNmList = params.get('detBdNmList') || '';
  const bdNm = params.get('bdNm') || '';
  const bdKdcd = params.get('bdKdcd') || '';
  const siNm = params.get('siNm') || '';
  const sggNm = params.get('sggNm') || '';
  const emdNm = params.get('emdNm') || '';
  const liNm = params.get('liNm') || '';
  const rn = params.get('rn') || '';
  const udrtYn = params.get('udrtYn') || '';
  const buldMnnm = params.get('buldMnnm') || '';
  const buldSlno = params.get('buldSlno') || '';
  const mtYn = params.get('mtYn') || '';
  const lnbrMnnm = params.get('lnbrMnnm') || '';
  const lnbrSlno = params.get('lnbrSlno') || '';
  const emdNo = params.get('emdNo') || '';

  // Send data to parent window and close popup
  return new NextResponse(`
    <html>
      <body>
        <script>
          const parentWindow = window.opener || window.parent;
          if (parentWindow && parentWindow.jusoCallBack) {
            parentWindow.jusoCallBack(
              "${roadFullAddr}",
              "${roadAddrPart1}",
              "${addrDetail}",
              "${roadAddrPart2}",
              "${engAddr}",
              "${jibunAddr}",
              "${zipNo}",
              "${admCd}",
              "${rnMgtSn}",
              "${bdMgtSn}",
              "${detBdNmList}",
              "${bdNm}",
              "${bdKdcd}",
              "${siNm}",
              "${sggNm}",
              "${emdNm}",
              "${liNm}",
              "${rn}",
              "${udrtYn}",
              "${buldMnnm}",
              "${buldSlno}",
              "${mtYn}",
              "${lnbrMnnm}",
              "${lnbrSlno}",
              "${emdNo}"
            );
          }
          window.close();
        </script>
      </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 