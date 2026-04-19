import { NextRequest, NextResponse } from "next/server";

const SHOP_PARSERS: Record<string, (doc: Document) => string | null> = {
  "www.musinsa.com": (doc) => {
    const el =
      doc.querySelector(".product-img img") ??
      doc.querySelector('meta[property="og:image"]');
    return el?.getAttribute("src") ?? el?.getAttribute("content") ?? null;
  },
  "www.29cm.co.kr": (doc) => {
    const el = doc.querySelector('meta[property="og:image"]');
    return el?.getAttribute("content") ?? null;
  },
  "zigzag.kr": (doc) => {
    const el = doc.querySelector('meta[property="og:image"]');
    return el?.getAttribute("content") ?? null;
  },
  "www.wconcept.co.kr": (doc) => {
    const el = doc.querySelector('meta[property="og:image"]');
    return el?.getAttribute("content") ?? null;
  },
};

const SUPPORTED_HOSTS = Object.keys(SHOP_PARSERS);

function getShopName(host: string): string {
  const map: Record<string, string> = {
    "www.musinsa.com": "무신사",
    "www.29cm.co.kr": "29CM",
    "zigzag.kr": "지그재그",
    "www.wconcept.co.kr": "W컨셉",
  };
  return map[host] ?? host;
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL을 입력해주세요." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "올바른 URL 형식이 아닙니다." }, { status: 400 });
  }

  const host = parsed.hostname;
  if (!SUPPORTED_HOSTS.includes(host)) {
    return NextResponse.json(
      { error: `지원하지 않는 쇼핑몰입니다. (지원: ${SUPPORTED_HOSTS.map((h) => getShopName(h)).join(", ")})` },
      { status: 400 }
    );
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "페이지를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }

  // 서버 사이드에서 HTML 파싱 (Edge Runtime이므로 DOMParser 대신 정규식)
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
    ?? html.match(/<title>([^<]+)<\/title>/i)?.[1];

  if (!ogImage) {
    return NextResponse.json({ error: "상품 이미지를 찾지 못했습니다. 이미지를 직접 업로드해주세요." }, { status: 404 });
  }

  const imageUrl = ogImage.startsWith("//") ? `https:${ogImage}` : ogImage;

  return NextResponse.json({
    imageUrl,
    title: ogTitle?.trim() ?? "",
    shopName: getShopName(host),
    sourceUrl: url,
  });
}
