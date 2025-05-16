import { NextResponse } from 'next/server';

// Common function to handle both GET and POST requests
async function handleRequest(request: Request) {
  let params: URLSearchParams;
  
  if (request.method === 'POST') {
    // Handle POST request data
    const formData = await request.formData();
    params = new URLSearchParams();
    // Convert FormData to URLSearchParams
    formData.forEach((value, key) => {
      params.append(key, value.toString());
    });
  } else {
    // Handle GET request data
    const url = new URL(request.url);
    params = url.searchParams;
  }
  
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
  const entX = params.get('entX') || '';
  const entY = params.get('entY') || '';
  console.log(entX, entY);

  // Send data to parent window and close popup
  return new NextResponse(`
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        <script>
          const parentWindow = window.opener || window.parent;
          if (parentWindow && parentWindow.jusoCallBack) {
            // Ensure proper decoding of Korean characters
            const decodeValue = (val) => {
              try {
                return decodeURIComponent(encodeURIComponent(val));
              } catch (e) {
                return val;
              }
            };

            parentWindow.jusoCallBack(
              decodeValue("${roadFullAddr}"),
              decodeValue("${roadAddrPart1}"),
              decodeValue("${addrDetail}"),
              decodeValue("${roadAddrPart2}"),
              decodeValue("${engAddr}"),
              decodeValue("${jibunAddr}"),
              "${zipNo}",
              "${admCd}",
              "${rnMgtSn}",
              "${bdMgtSn}",
              decodeValue("${detBdNmList}"),
              decodeValue("${bdNm}"),
              "${bdKdcd}",
              decodeValue("${siNm}"),
              decodeValue("${sggNm}"),
              decodeValue("${emdNm}"),
              decodeValue("${liNm}"),
              decodeValue("${rn}"),
              "${udrtYn}",
              "${buldMnnm}",
              "${buldSlno}",
              "${mtYn}",
              "${lnbrMnnm}",
              "${lnbrSlno}",
              "${emdNo}",
              "${entX}",
              "${entY}"
            );
          }
          window.close();
        </script>
      </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    },
  });
}

// Handle GET requests
export async function GET(request: Request) {
  return handleRequest(request);
}

// Handle POST requests
export async function POST(request: Request) {
  return handleRequest(request);
} 