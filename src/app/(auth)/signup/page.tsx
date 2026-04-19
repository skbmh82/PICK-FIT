"use client";

import { signup } from "@/lib/auth/actions";
import Link from "next/link";
import { useActionState } from "react";

const initialState = { error: "", success: "" };

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    async (_: typeof initialState, formData: FormData) => {
      const password = formData.get("password") as string;
      const confirm = formData.get("confirm") as string;
      if (password !== confirm) {
        return { error: "비밀번호가 일치하지 않습니다.", success: "" };
      }
      if (password.length < 8) {
        return { error: "비밀번호는 8자 이상이어야 합니다.", success: "" };
      }
      const result = await signup(formData);
      return { ...initialState, ...result };
    },
    initialState
  );

  if (state?.success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-10">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            인증 메일 발송 완료
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">{state.success}</p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">회원가입</h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="8자 이상 입력"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
              비밀번호 확인
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              placeholder="비밀번호 재입력"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <p className="text-xs text-gray-400 leading-relaxed">
            가입 시{" "}
            <span className="underline cursor-pointer">이용약관</span> 및{" "}
            <span className="underline cursor-pointer">개인정보처리방침</span>에
            동의하는 것으로 간주됩니다. (만 14세 이상)
          </p>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
          >
            {isPending ? "가입 중..." : "회원가입"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-violet-600 hover:text-violet-700">
          로그인
        </Link>
      </p>
    </div>
  );
}
