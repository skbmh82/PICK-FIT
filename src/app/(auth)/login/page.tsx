"use client";

import { login } from "@/lib/auth/actions";
import Link from "next/link";
import { useActionState } from "react";

const initialState = { error: "" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (_: typeof initialState, formData: FormData) => {
      const result = await login(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <div className="w-full max-w-sm">
      {/* 로고 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          PICK<span className="text-violet-600">FIT</span>
        </h1>
        <p className="mt-2 text-sm text-fuchsia-500 font-medium">입기 전에 먼저 입어봐!</p>
      </div>

      {/* 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">로그인</h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="비밀번호 입력"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
          >
            {isPending ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        아직 계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-medium text-violet-600 hover:text-violet-700"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}
