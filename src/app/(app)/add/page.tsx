"use client";

import { useState, useRef, useTransition } from "react";
import { addGarmentByUrl, addGarmentByUpload } from "@/lib/garments/actions";
import { useRouter } from "next/navigation";

type Tab = "url" | "upload";
type SelRect = { x: number; y: number; w: number; h: number };

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
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // 화면 캡쳐 오버레이
  const [captureScreen, setCaptureScreen] = useState<string | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ x: number; y: number } | null>(null);
  const [selRect, setSelRect] = useState<SelRect | null>(null);

  const router = useRouter();


  async function handleParse() {
    if (!url.trim()) return;
    setError("");
    setPreview(null);
    setShowManualInput(false);
    setIsParsing(true);
    try {
      const res = await fetch("/api/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setShowManualInput(true);
        return;
      }
      setPreview(data);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setShowManualInput(true);
    } finally {
      setIsParsing(false);
    }
  }

  function handleManualImage() {
    if (!manualImageUrl.trim()) return;
    const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
    const shopName = host.replace(/^www\./, "").split(".")[0] ?? "직접 입력";
    setPreview({ imageUrl: manualImageUrl.trim(), title: "", shopName });
    setShowManualInput(false);
    setError("");
  }

  // 화면 캡쳐: getDisplayMedia → 오버레이 표시
  async function handleScreenCapture() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("이 브라우저는 화면 캡쳐를 지원하지 않습니다. Ctrl+V 붙여넣기를 이용해주세요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      stream.getTracks().forEach((t) => t.stop());
      captureCanvasRef.current = canvas;
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (captureScreen) URL.revokeObjectURL(captureScreen);
        setCaptureScreen(URL.createObjectURL(blob));
        setSelRect(null);
      }, "image/png");
    } catch (e) {
      if (e instanceof Error && e.name !== "NotAllowedError") {
        setError("화면 캡쳐에 실패했습니다. Ctrl+V 붙여넣기를 이용해주세요.");
      }
    }
  }

  function closeCaptureOverlay() {
    if (captureScreen) URL.revokeObjectURL(captureScreen);
    setCaptureScreen(null);
    setSelRect(null);
    setSelStart(null);
    setIsSelecting(false);
  }

  // 드래그 선택
  function onOverlayMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setSelStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setSelRect(null);
    setIsSelecting(true);
  }

  function onOverlayMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isSelecting || !selStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setSelRect({
      x: Math.min(cx, selStart.x),
      y: Math.min(cy, selStart.y),
      w: Math.abs(cx - selStart.x),
      h: Math.abs(cy - selStart.y),
    });
  }

  function onOverlayMouseUp() {
    if (!isSelecting) return;
    setIsSelecting(false);
    if (!selRect || selRect.w < 10 || selRect.h < 10) return;

    const canvas = captureCanvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const scaleX = canvas.width / overlay.clientWidth;
    const scaleY = canvas.height / overlay.clientHeight;

    const crop = document.createElement("canvas");
    crop.width = Math.round(selRect.w * scaleX);
    crop.height = Math.round(selRect.h * scaleY);
    crop.getContext("2d")!.drawImage(
      canvas,
      selRect.x * scaleX, selRect.y * scaleY,
      selRect.w * scaleX, selRect.h * scaleY,
      0, 0, crop.width, crop.height
    );

    crop.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "capture.png", { type: "image/png" });
      setError("");
      setPastedFile(file);
      setFilePreview(URL.createObjectURL(file));
      closeCaptureOverlay();
    }, "image/png");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("파일 크기는 10MB 이하만 가능합니다."); return; }
    setError("");
    setPastedFile(null);
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
    const file = pastedFile ?? fileRef.current?.files?.[0];
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
    <>
      {/* ── 화면 캡쳐 오버레이 ── */}
      {captureScreen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 cursor-crosshair select-none"
          style={{ backgroundImage: `url(${captureScreen})`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}
          onMouseDown={onOverlayMouseDown}
          onMouseMove={onOverlayMouseMove}
          onMouseUp={onOverlayMouseUp}
          onMouseLeave={onOverlayMouseUp}
        >
          {/* 선택 전 전체 딤 */}
          {!selRect && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

          {/* 안내 문구 */}
          {!isSelecting && !selRect && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/75 text-white text-sm px-5 py-3 rounded-2xl text-center pointer-events-none shadow-xl">
              <p className="font-semibold">드래그해서 옷 부분을 선택하세요</p>
              <p className="text-xs text-white/60 mt-0.5">선택한 영역만 캡쳐됩니다</p>
            </div>
          )}

          {/* 선택 영역 주변 딤 + 선택 사각형 */}
          {selRect && (
            <>
              <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, top: 0, right: 0, height: selRect.y }} />
              <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, top: selRect.y + selRect.h, right: 0, bottom: 0 }} />
              <div className="absolute bg-black/50 pointer-events-none" style={{ left: 0, top: selRect.y, width: selRect.x, height: selRect.h }} />
              <div className="absolute bg-black/50 pointer-events-none" style={{ left: selRect.x + selRect.w, top: selRect.y, right: 0, height: selRect.h }} />
              <div className="absolute border-2 border-white pointer-events-none shadow-lg" style={{ left: selRect.x, top: selRect.y, width: selRect.w, height: selRect.h }} />
            </>
          )}

          {/* 취소 버튼 */}
          <button
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 text-sm px-4 py-2 rounded-xl font-medium shadow-lg transition"
            onClick={(e) => { e.stopPropagation(); closeCaptureOverlay(); }}
          >
            취소
          </button>
        </div>
      )}

      {/* ── 메인 화면 ── */}
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
              onClick={() => { setTab(t); setError(""); setPreview(null); setFilePreview(null); setPastedFile(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                tab === t ? "bg-white text-violet-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
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

            {showManualInput && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                <p className="text-xs text-orange-600 font-medium">
                  💡 상품 이미지를 우클릭 → <b>"이미지 주소 복사"</b> 후 아래에 붙여넣으세요
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualImage()}
                    placeholder="https://... 이미지 URL 붙여넣기"
                    className="flex-1 px-3 py-2 rounded-xl border border-orange-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <button
                    onClick={handleManualImage}
                    disabled={!manualImageUrl.trim()}
                    className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}

            {preview && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 flex gap-4 items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.imageUrl}
                  alt="상품 이미지"
                  className="w-20 h-24 object-cover rounded-xl border border-gray-200 bg-white"
                  onError={() => setShowManualInput(true)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                    {preview.shopName}
                  </span>
                  <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">{preview.title}</p>
                  {showManualInput ? (
                    <p className="text-xs text-orange-500 mt-1 font-medium">⚠️ 이미지를 불러올 수 없어요</p>
                  ) : (
                    <p className="text-xs text-green-600 mt-1 font-medium">✓ 이미지 인식 완료</p>
                  )}
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="mt-2 text-xs text-violet-500 underline underline-offset-2"
                  >
                    🔗 이미지 주소 직접 입력
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 업로드 탭 */}
        {tab === "upload" && (
          <div className="space-y-3">
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
                    <p className="text-sm font-medium text-gray-600">클릭해서 이미지 선택</p>
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

            {/* 화면 캡쳐 버튼 */}
            <button
              type="button"
              onClick={handleScreenCapture}
              className="w-full py-3 rounded-2xl border-2 border-violet-200 text-violet-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-violet-50 active:bg-violet-100 transition"
            >
              <span>✂️</span>
              <span>화면 캡쳐해서 가져오기</span>
            </button>
            <p className="text-xs text-gray-400 text-center">
              버튼을 누르면 화면 공유 → 원하는 영역만 드래그해서 선택하세요
            </p>
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
    </>
  );
}
