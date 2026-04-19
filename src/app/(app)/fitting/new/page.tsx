"use client";

import { startTryOn } from "@/lib/tryon/actions";
import { useSearchParams, useRouter } from "next/navigation";
import { useRef, useState, useTransition, Suspense } from "react";

function FittingNewInner() {
  const params = useSearchParams();
  const garmentId = params.get("garmentId") ?? "";
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("파일 크기는 10MB 이하만 가능합니다."); return; }
    setError("");
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("사진을 업로드해주세요."); return; }
    const fd = new FormData();
    fd.append("garmentId", garmentId);
    fd.append("file", file);
    startTransition(async () => {
      const result = await startTryOn(fd);
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
        <h1 className="text-lg font-bold text-gray-900">내 사진 업로드</h1>
      </div>

      {/* 안내 */}
      <div className="bg-violet-50 rounded-2xl p-4 mb-6">
        <p className="text-sm font-medium text-violet-700 mb-1">사진 촬영 팁</p>
        <ul className="text-xs text-violet-600 space-y-0.5 list-disc list-inside">
          <li>전신이 나오는 사진이 가장 좋아요</li>
          <li>밝은 곳에서 정면을 바라보고 촬영하세요</li>
          <li>몸에 붙는 옷을 입은 사진을 사용하세요</li>
        </ul>
      </div>

      {/* 업로드 영역 */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition min-h-72 mb-6 ${
          preview ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="내 사진" className="max-h-80 object-contain rounded-xl" />
        ) : (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🧍</p>
            <p className="text-sm font-medium text-gray-600">전신 사진을 업로드하세요</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG · 최대 10MB</p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || !preview}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-2xl disabled:opacity-50 transition shadow-md text-base"
      >
        {isPending ? "피팅 준비 중..." : "✨ 피팅 시작하기"}
      </button>
    </div>
  );
}

export default function FittingNewPage() {
  return (
    <Suspense>
      <FittingNewInner />
    </Suspense>
  );
}
