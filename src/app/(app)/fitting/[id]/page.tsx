"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Status = "processing" | "done" | "failed";


const STEPS = [
  "사진 분석 중...",
  "옷 패턴 인식 중...",
  "AI 피팅 생성 중...",
  "마무리 중...",
];

function FittingResultInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();

  const userImg = params.get("userImg") ?? "";
  const garmImg = params.get("garmImg") ?? "";

  const [status, setStatus] = useState<Status>("processing");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // 단계 텍스트 순환
  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(() => setStepIdx((i) => (i + 1) % STEPS.length), 4000);
    return () => clearInterval(t);
  }, [status]);

  // 경과 시간
  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // AI API 호출
  const runTryOn = useCallback(async () => {
    if (!userImg || !garmImg) return;
    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tryOnId: id, userImageUrl: userImg, garmentImageUrl: garmImg }),
      });
      const data = await res.json();
      if (res.ok && data.resultUrl) {
        setResultUrl(data.resultUrl);
        setStatus("done");
      } else {
        setErrorMsg(data.error ?? "알 수 없는 오류");
        setStatus("failed");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "네트워크 오류");
      setStatus("failed");
    }
  }, [id, userImg, garmImg]);

  useEffect(() => { runTryOn(); }, [runTryOn]);

  // 로딩 화면
  if (status === "processing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          {/* 애니메이션 */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">👗</div>
          </div>

          <p className="text-lg font-bold text-gray-900 mb-2">AI 피팅 중</p>
          <p className="text-sm text-violet-600 font-medium mb-6 h-5">{STEPS[stepIdx]}</p>

          {/* 진행 바 */}
          <div className="w-64 bg-gray-100 rounded-full h-1.5 mx-auto mb-3">
            <div
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((elapsed / 30) * 100, 95)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{elapsed}초 경과 · 약 20~30초 소요</p>
        </div>
      </div>
    );
  }

  // 실패 화면
  if (status === "failed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">😢</p>
          <p className="text-lg font-bold text-gray-900 mb-2">피팅에 실패했어요</p>
          <p className="text-sm text-gray-500 mb-2">사진을 다시 확인하거나 잠시 후 시도해주세요.</p>
          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-50 rounded-xl px-4 py-2 mb-6 max-w-xs mx-auto break-all">{errorMsg}</p>
          )}
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium rounded-2xl"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 결과 화면
  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">피팅 결과</h1>
        <Link href="/home" className="text-sm text-gray-400 hover:text-gray-600">홈으로</Link>
      </div>

      {/* 결과 이미지 */}
      <div className="rounded-2xl overflow-hidden bg-gray-100 mb-4 aspect-[3/4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resultUrl!} alt="피팅 결과" className="w-full h-full object-cover" />
      </div>

      {/* 비교 썸네일 */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 text-center">
          <div className="rounded-xl overflow-hidden aspect-[3/4] bg-gray-100 mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={decodeURIComponent(userImg)} alt="내 사진" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-gray-400">내 사진</p>
        </div>
        <div className="flex items-center text-gray-300 text-xl">→</div>
        <div className="flex-1 text-center">
          <div className="rounded-xl overflow-hidden aspect-[3/4] bg-gray-100 mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={decodeURIComponent(garmImg)} alt="선택한 옷" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-gray-400">선택한 옷</p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <a
          href={resultUrl!}
          download="pickfit-result.jpg"
          className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium rounded-2xl text-center"
        >
          저장하기
        </a>
        <Link
          href="/add"
          className="flex-1 py-3 border border-violet-200 text-violet-600 text-sm font-medium rounded-2xl text-center"
        >
          다른 옷 입어보기
        </Link>
      </div>
    </div>
  );
}

export default function FittingResultPage() {
  return (
    <Suspense>
      <FittingResultInner />
    </Suspense>
  );
}
