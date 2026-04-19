"use client";

import { useState, useRef, useTransition } from "react";
import { addGarmentByUrl, addGarmentByUpload } from "@/lib/garments/actions";
import { useRouter } from "next/navigation";

type Tab = "url" | "upload";

const CATEGORIES = [
  { value: "top",    label: "상의" },
  { value: "bottom", label: "하의" },
  { value: "dress",  label: "원피스" },
  { value: "outer",  label: "아우터" },
  { value: "etc",    label: "기타" },
];

export default function AddPage() {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<{ imageUrl: string; title: string; shopName: string } | null>(null);
  const [category, setCategory] = useState("top");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const router = useRouter();

  async function handleParse() {
    if (!url.trim()) return;
    setError("");
    setPreview(null);
    setIsParsing(true);
    try {
      const res = await fetch("/api/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setPreview(data);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("파일 크기는 10MB 이하만 가능합니다."); return; }
    setError("");
    setFilePreview(URL.createObjectURL(file));
  }

  function submitUrl(destination: "fit" | "wardrobe") {
    if (!preview) return;
    const fd = new FormData();
    fd.append("imageUrl", preview.imageUrl);
    fd.append("sourceUrl", url);
    fd.append("shopName", preview.shopName);
    fd.append("category", category);
    fd.append("destination", destination);
    startTransition(async () => {
      const result = await addGarmentByUrl(fd);
      if (result?.error) setError(result.error);
    });
  }

  function submitUpload(destination: "fit" | "wardrobe") {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("파일을 선택해주세요."); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    fd.append("destination", destination);
    startTransition(async () => {
      const result = await addGarmentByUpload(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">아이템 추가</h1>
      </div>

      {/* 탭 */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        {(["url", "upload"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); setPreview(null); setFilePreview(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              tab === t
                ? "bg-white text-violet-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "url" ? "🔗 쇼핑몰 URL" : "📷 이미지 업로드"}
          </button>
        ))}
      </div>

      {/* URL 탭 */}
      {tab === "url" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setPreview(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleParse()}
              placeholder="쇼핑몰 상품 URL을 붙여넣으세요"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
            <button
              onClick={handleParse}
              disabled={isParsing || !url.trim()}
              className="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 whitespace-nowrap"
            >
              {isParsing ? "분석 중..." : "가져오기"}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            무신사 · 29CM · 지그재그 · 쿠팡 · 에이블리 등 대부분의 쇼핑몰 지원
          </p>

          {preview && (
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 flex gap-4 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.imageUrl}
                alt="상품 이미지"
                className="w-20 h-24 object-cover rounded-xl border border-gray-200 bg-white"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                  {preview.shopName}
                </span>
                <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">{preview.title}</p>
                <p className="text-xs text-green-600 mt-1 font-medium">✓ 이미지 인식 완료</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 업로드 탭 */}
      {tab === "upload" && (
        <div className="space-y-4">
          <label className="block cursor-pointer">
            <div
              className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition min-h-48 ${
                filePreview ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"
              }`}
            >
              {filePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreview} alt="미리보기" className="max-h-64 object-contain rounded-xl" />
              ) : (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">📷</p>
                  <p className="text-sm font-medium text-gray-600">옷 이미지를 업로드하세요</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · 최대 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* 카테고리 */}
      {(preview || filePreview) && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">카테고리</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                  category === value
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* 버튼 영역 */}
      {(preview || filePreview) && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => tab === "url" ? submitUrl("wardrobe") : submitUpload("wardrobe")}
            disabled={isPending}
            className="flex-1 py-4 border-2 border-violet-300 text-violet-600 font-semibold rounded-2xl disabled:opacity-50 transition text-base"
          >
            {isPending ? "저장 중..." : "옷장에 저장"}
          </button>
          <button
            onClick={() => tab === "url" ? submitUrl("fit") : submitUpload("fit")}
            disabled={isPending}
            className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-2xl disabled:opacity-50 transition shadow-md text-base"
          >
            {isPending ? "저장 중..." : "👗 바로 피팅"}
          </button>
        </div>
      )}
    </div>
  );
}
