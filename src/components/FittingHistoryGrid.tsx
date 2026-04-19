"use client";

import { useState } from "react";
import { deleteTryOn } from "@/lib/tryon/actions";

type TryOn = {
  id: string;
  result_url: string | null;
  status: string;
  created_at: string;
  garments: { shop_name?: string } | { shop_name?: string }[] | null;
};

export default function FittingHistoryGrid({ tryOns }: { tryOns: TryOn[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 피팅 기록을 삭제할까요?")) return;
    setDeletingId(id);
    await deleteTryOn(id);
    setDeletingId(null);
  }

  function getShopName(garments: TryOn["garments"]) {
    if (Array.isArray(garments)) return garments[0]?.shop_name ?? "직접 업로드";
    return (garments as { shop_name?: string } | null)?.shop_name ?? "직접 업로드";
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {tryOns.map((item) => (
        <div key={item.id} className="relative group rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
          <div className="aspect-[3/4] relative bg-gray-100">
            {item.result_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.result_url}
                alt="피팅 결과"
                className={`w-full h-full object-cover transition ${deletingId === item.id ? "opacity-40" : ""}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <p className="text-xl">😢</p>
                <p className="text-xs text-red-400">피팅 실패</p>
              </div>
            )}
          </div>
          <div className="px-2.5 py-2">
            <p className="text-xs text-gray-500 truncate">{getShopName(item.garments)}</p>
            <p className="text-xs text-gray-300">
              {new Date(item.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>

          {/* 삭제 버튼 */}
          <button
            onClick={(e) => handleDelete(e, item.id)}
            disabled={deletingId === item.id}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
