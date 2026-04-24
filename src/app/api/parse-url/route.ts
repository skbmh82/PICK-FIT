import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function getShopName(host: string): string {
  const map: Record<string, string> = {
    "www.musinsa.com":      "무신사",
    "www.29cm.co.kr":       "29CM",
    "zigzag.kr":            "지그재그",
    "www.wconcept.co.kr":   "W컨셉",
    "www.coupang.com":      "쿠팡",
    "www.ssg.com":          "SSG",
    "shopping.naver.com":   "네이버쇼핑",
    "smartstore.naver.com": "네이버스마트스토어",
    "kr.shein.com":         "쉬인",
    "www.ably.kr":          "에이블리",
    "www.stylenanda.com":   "스타일난다",
    "www.lotte.com":        "롯데온",
  };
  return map[host] ?? host.replace(/^www\./, "");
}

// 외부 이미지를 Supabase Storage에 복사 → 영구 URL 반환
async function proxyImage(externalUrl: string): Promise<string> {
  try {
    const res = await fetch(externalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "Referer": new URL(externalUrl).origin,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return externalUrl;

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `parsed/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("garments")
      .upload(path, buffer, { contentType, upsert: false });

    if (error) return externalUrl;

    const { data: { publicUrl } } = supabaseAdmin.storage.from("garments").getPublicUrl(path);
    return publicUrl;
  } catch {
    return externalUrl; // 실패 시 원본 URL 반환
  }
}

// HTML에서 이미지 URL 추출 (다양한 방법 시도)
function extractImageUrl(html: string, host: string): string | null {
  // 1. og:image (표준)
  const ogImage =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  if (ogImage) return ogImage;

  // 2. JSON-LD schema.org (네이버 스마트스토어 등)
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      try {
        const json = JSON.parse(block.replace(/<\/?script[^>]*>/gi, ""));
        const img = json.image ?? json.offers?.image ?? json.thumbnail;
        if (img) return Array.isArray(img) ? img[0] : img;
      } catch { /* skip */ }
    }
  }

  // 3. __NEXT_DATA__ (Next.js 기반 쇼핑몰 — 29CM 등)
  const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (nextData) {
    try {
      const data = JSON.parse(nextData);
      const str = JSON.stringify(data);
      // 이미지 URL 패턴 검색
      const imgMatch = str.match(/"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))[^"]*"/i);
      if (imgMatch) return imgMatch[1];
    } catch { /* skip */ }
  }

  // 4. 쿠팡 전용 — 모바일 API 이미지 패턴
  if (host === "www.coupang.com") {
    const cpMatch = html.match(/thumbnail['":\s]+["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))/i);
    if (cpMatch) return cpMatch[1];
  }

  // 5. 일반 큰 이미지 추출 (최후 수단)
  const imgMatch = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))[^"']*["'][^>]+(?:width|class)[^>]*(?:product|main|detail|thumb)/i);
  if (imgMatch) return imgMatch[1];

  return null;
}

function extractTitle(html: string): string {
  return (
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1] ??
    ""
  );
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

  // 쿠팡: 모바일 URL로 전환 (더 많은 정적 HTML)
  const fetchUrl = host === "www.coupang.com"
    ? url.replace("www.coupang.com", "m.coupang.com")
    : url;

  let html: string;
  try {
    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": `https://${host}/`,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "페이지를 불러오지 못했습니다. 직접 이미지를 업로드해주세요." }, { status: 502 });
  }

  const rawImage = extractImageUrl(html, host);

  if (!rawImage) {
    return NextResponse.json({
      error: `이 쇼핑몰은 이미지 자동 인식이 어렵습니다. 상품 이미지를 직접 업로드해주세요.`,
    }, { status: 404 });
  }

  // protocol-relative URL 처리
  const absoluteImage = rawImage.startsWith("//") ? `https:${rawImage}` : rawImage;

  // 외부 CDN 이미지 → Supabase Storage에 복사 (Replicate 접근 보장)
  const imageUrl = await proxyImage(absoluteImage);
  const title = extractTitle(html);

  return NextResponse.json({
    imageUrl,
    title: title.trim(),
    shopName: getShopName(host),
    sourceUrl: url,
  });
}
