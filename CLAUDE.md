# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

환경변수: `.env.local.example` → `.env.local` 복사 후 값 입력.

## 프로젝트 개요

**PICK FIT** — Pi Network 생태계 기반 한국어 AI 가상 피팅 서비스  
슬로건: "입기 전에 먼저 입어봐! 사기 전에 먼저 입어봐!"  
작성자: Boutique (KANG SEONGSHIN) | 관련 플랫폼: PICK PICK (피픽) 모바일 플랫폼

한국 주요 패션 플랫폼(무신사, 29CM, 지그재그, W컨셉)에 가상 피팅 기능이 없다는 Blue Ocean 기회를 공략. Kolors Virtual Try-On 모델로 20~30대 여성을 타겟.

## 기술 스택

- **Frontend/Backend**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS
- **DB / Auth / Storage**: Supabase (RLS 적용, 이미지 자동 저장)
- **Auth**: Supabase Auth + Pi SDK (Pi Browser / 카카오 / 네이버 로그인)
- **AI**: Kolors Virtual Try-On via Replicate API (`$0.03/회`)
- **Hosting**: Vercel (Edge Functions로 URL 파싱)
- **SNS 공유**: Kakao SDK

## 아키텍처 원칙

- **PICK PICK 공유 컴포넌트** 최대 재사용 (커스텀 개발 최소화)
- **Pi Browser 우선** 배포 (앱스토어 불필요)
- **AI API 프로바이더 추상화** — 환경변수 하나로 교체 가능:

```
TRYON_PROVIDER=kolors   # 또는 fashn, google
```

어댑터 구조 (`/lib/virtual-tryon/`):
```
types.ts       # 공통 타입
adapter.ts     # 추상 인터페이스
kolors.ts      # Kolors 구현체 (MVP)
fashn.ts       # Fashn.ai 구현체 (Phase 2 대비)
index.ts       # 활성 프로바이더 export
```

## 데이터베이스 스키마

```sql
users           (id, email, pi_uid, profile_image_url, plan, created_at)
garments        (id, user_id, image_url, source_url, category, shop_name, created_at)
try_ons         (id, user_id, garment_id, result_url, status, cost, created_at)
referrals       (id, referrer_id, referee_id, status, reward_granted, created_at)
pick_transactions (id, user_id, type, amount, balance_after, created_at)
```

## MVP 핵심 기능 (7개 화면)

1. **랜딩/로그인** — Pi / 카카오 / 네이버 OAuth
2. **홈** — 최근 피팅 + 활동 피드
3. **아이템 추가** — URL 입력 또는 이미지 업로드
4. **피팅 로딩** — 진행 단계 표시 (처리 시간 20~30초)
5. **피팅 결과** — 저장 / 공유 / 추천
6. **옷장(워드로브)** — 갤러리 뷰, 날짜·카테고리·쇼핑몰 필터
7. **프로필** — 플랜 설정, 이용 내역, 로그아웃

## URL 자동 파싱 (MVP 지원 쇼핑몰)

| 쇼핑몰 | 도메인 |
|--------|--------|
| 무신사 | www.musinsa.com |
| 29CM | www.29cm.co.kr |
| 지그재그 | zigzag.kr |
| W컨셉 | www.wconcept.co.kr |

- Vercel Edge Functions로 HTML 파싱
- Open Graph 이미지 우선 추출
- 쇼핑몰별 파싱 로직 분리 (사이트마다 이미지 URL 구조 다름)

## 요금제 구조

| 플랜 | 가격 | 피팅 횟수 |
|------|------|----------|
| 무료 | 0원 | 월 3회 |
| Basic | 월 4,900원 | 월 20회 |
| Pro | 월 9,900원 | 무제한(30~50회 가이드) |
| 크레딧 10회 | 4,900원 | — |
| 크레딧 30회 | 12,900원 | — |

**Phase 3 (Pi 연동 시)**: Basic = 4,000 PICK (≈₩4,000, 18% 할인)

## 로드맵

- **MVP (현재)**: 2개월 빌드 → 6월 중 런칭 목표
- **Phase 2** (3~6개월): 친구 초대 시스템, 쇼핑몰 확대, AI 스타일 추천, 구독 결제
- **Phase 3** (6~9개월): PICK 토큰 발행, Pi Network 완전 연동
- **Phase 4** (9~18개월): React Native 앱, 일본·베트남 진출, B2B API

**Plan A** (Pi 생태계 활성화 시) vs **Plan B** (Pi 지연 시 일반 소비자 서비스로 자동 전환) — 환경변수로 분기.

## North Star Metric

**주간 피팅 완료 수 (Weekly Try-Ons Completed)**

주요 KPI 목표 (6개월):
- MAU 10,000명, 월간 피팅 5,000회, 유료 전환율 5%, D30 리텐션 10%
- BEP: MAU 약 2,500명

## 주요 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| Kolors API 가격 인상/중단 | Fashn.ai로 어댑터 교체 (환경변수 1개) |
| 무신사/29CM 스크래핑 차단 | 제휴 API + AI 스타일 추천으로 전환 |
| 글로벌 경쟁자 한국 진출 | MVP 조기 런칭 + 한국 쇼핑몰 특화 |
| Pi Network 지연 | Plan B 자동 전환 |

## 보안 / 개인정보

- Supabase RLS 필수 적용
- 이미지 자동 암호화 저장
- 피팅 결과 이미지 30일 자동 삭제 (기본 정책, Pro는 무제한)
- 미성년자 이용 제한 (만 14세 이상, 부모 동의 필요)
- 결제 완료 후 청약철회 불가 고지
