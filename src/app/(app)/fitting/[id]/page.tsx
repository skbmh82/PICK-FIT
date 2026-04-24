"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Status = "processing" | "done" | "failed";

const TIPS = [
  { icon: "📸", title: "더 좋은 피팅을 위한 팁", body: "전신이 잘 보이는 밝은 곳에서 찍은 사진일수록 AI가 더 정확하게 분석해요." },
  { icon: "👗", title: "어떤 옷이 잘 어울릴까요?", body: "체형에 맞는 실루엣을 찾고 있다면 와이드핏 하의와 크롭 상의 조합을 시도해보세요." },
  { icon: "🎨", title: "컬러 매칭 꿀팁", body: "무채색(블랙·화이트·그레이)은 어떤 색과도 잘 어울려요. 처음엔 무채색 아이템부터 시작해보세요." },
  { icon: "🛍️", title: "알고 계셨나요?", body: "온라인 쇼핑 반품의 70%는 '실제로 입어보니 다르다'는 이유예요. PICK FIT이 해결합니다!" },
  { icon: "✨", title: "스타일링 법칙", body: "3:7 비율로 옷을 입으면 키가 더 커 보여요. 상의를 짧게, 하의를 길게 연출해보세요." },
  { icon: "💡", title: "이미지 선택 팁", body: "배경이 단순하고 옷이 잘 펼쳐진 상품 이미지를 선택하면 피팅 정확도가 올라가요." },
  { icon: "🔥", title: "이번 시즌 트렌드", body: "오버사이즈 실루엣과 레이어링이 핫트렌드! 한 사이즈 크게 입어보는 건 어떨까요?" },
  { icon: "👠", title: "신발도 중요해요", body: "같은 옷도 신발에 따라 전혀 다른 무드가 나와요. 스니커즈 vs 로퍼, 당신의 선택은?" },
];

const STAGES = [
  { label: "사진 분석", desc: "체형과 자세를 인식하고 있어요" },
  { label: "옷 분석", desc: "옷의 패턴과 소재를 파악 중이에요" },
  { label: "AI 피팅", desc: "내 몸에 옷을 맞춰 그리는 중이에요" },
  { label: "마무리", desc: "디테일을 다듬고 있어요" },
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
  const [elapsed, setElapsed] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const predictionIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 경과 시간
  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // 단계 진행 (20초마다)
  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(() => setStageIdx((i) => Math.min(i + 1, STAGES.length - 1)), 20000);
    return () => clearInterval(t);
  }, [status]);

  // 팁 슬라이드 (8초마다 페이드)
  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIdx((i) => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(t);
  }, [status]);

  const poll = useCallback(async (predictionId: string) => {
    try {
      const res = await fetch(`/api/tryon/poll?id=${predictionId}&tryOnId=${id}`);
      const data = await res.json();
      if (data.status === "done") {
        setResultUrl(data.resultUrl);
        setStatus("done");
      } else if (data.status === "failed") {
        setErrorMsg(data.error ?? "AI 처리 실패");
        setStatus("failed");
      } else {
        pollTimerRef.current = setTimeout(() => poll(predictionId), 5000);
      }
    } catch {
      pollTimerRef.current = setTimeout(() => poll(predictionId), 5000);
    }
  }, [id]);

  const startTryOn = useCallback(async () => {
    if (!userImg || !garmImg) return;
    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tryOnId: id, userImageUrl: userImg, garmentImageUrl: garmImg }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "예측 시작 실패"); setStatus("failed"); return; }
      predictionIdRef.current = data.predictionId;
      poll(data.predictionId);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "네트워크 오류");
      setStatus("failed");
    }
  }, [id, userImg, garmImg, poll]);

  useEffect(() => {
    startTryOn();
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [startTryOn]);

  // ── 로딩 화면 ──────────────────────────────────────
  if (status === "processing") {
    const progress = Math.min((elapsed / 90) * 100, 95);

    return (
      <div className="min-h-screen flex flex-col px-4 pt-6 pb-8">

        {/* 상단: 내 사진 + 옷 미리보기 */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 rounded-2xl overflow-hidden bg-gray-100 aspect-[3/4] relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={decodeURIComponent(userImg)} alt="내 사진" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent py-2 text-center">
              <p className="text-white text-xs font-medium">내 사진</p>
            </div>
          </div>

          {/* 가운데 AI 애니메이션 */}
          <div className="flex flex-col items-center justify-center gap-2 w-10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center animate-pulse">
              <span className="text-white text-xs">AI</span>
            </div>
            <div className="flex flex-col gap-1">
              {[0,1,2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>

          <div className="flex-1 rounded-2xl overflow-hidden bg-gray-100 aspect-[3/4] relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={decodeURIComponent(garmImg)} alt="선택한 옷" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent py-2 text-center">
              <p className="text-white text-xs font-medium">선택한 옷</p>
            </div>
          </div>
        </div>

        {/* 진행 단계 */}
        <div className="flex justify-between mb-2 px-1">
          {STAGES.map((stage, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                i < stageIdx ? "bg-violet-600 text-white" :
                i === stageIdx ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white scale-110 shadow-lg shadow-violet-200" :
                "bg-gray-100 text-gray-400"
              }`}>
                {i < stageIdx ? "✓" : i + 1}
              </div>
              <p className={`text-xs font-medium transition-colors ${i === stageIdx ? "text-violet-600" : "text-gray-400"}`}>
                {stage.label}
              </p>
            </div>
          ))}
        </div>

        {/* 프로그레스 바 */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
          <div
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mb-6">
          <p className="text-xs text-violet-600 font-medium">{STAGES[stageIdx].desc}</p>
          <p className="text-xs text-gray-400">{elapsed}초</p>
        </div>

        {/* 팁 카드 */}
        <div
          className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 p-4 flex-1 flex flex-col justify-center transition-opacity duration-400"
          style={{ opacity: tipVisible ? 1 : 0 }}
        >
          <div className="text-center mb-3">
            <span className="text-3xl">{TIPS[tipIdx].icon}</span>
          </div>
          <p className="text-sm font-bold text-violet-700 text-center mb-2">{TIPS[tipIdx].title}</p>
          <p className="text-sm text-gray-600 text-center leading-relaxed">{TIPS[tipIdx].body}</p>

          {/* 팁 인디케이터 */}
          <div className="flex justify-center gap-1.5 mt-4">
            {TIPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setTipVisible(false); setTimeout(() => { setTipIdx(i); setTipVisible(true); }, 300); }}
                className={`rounded-full transition-all ${i === tipIdx ? "w-4 h-1.5 bg-violet-500" : "w-1.5 h-1.5 bg-violet-200"}`}
              />
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          AI가 열심히 작업 중이에요 · 잠시만 기다려주세요 ☕
        </p>
      </div>
    );
  }

  // ── 실패 화면 ──────────────────────────────────────
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

  // ── 결과 화면 ──────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">피팅 결과</h1>
        <Link href="/home" className="text-sm text-gray-400 hover:text-gray-600">홈으로</Link>
      </div>
      <div className="rounded-2xl overflow-hidden bg-gray-100 mb-4 aspect-[3/4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resultUrl!} alt="피팅 결과" className="w-full h-full object-cover" />
      </div>
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
      <div className="flex gap-3">
        <a
          href={resultUrl!}
          download="pickfit-result.jpg"
          className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium rounded-2xl text-center"
        >
          저장하기
        </a>
        <Link
          href="/wardrobe"
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
