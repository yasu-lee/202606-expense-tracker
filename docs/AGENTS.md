# Project Agent Guide

이 프로젝트는 개인 지출, 공유 지출, 여행 지출을 통합 관리하는 모바일 앱 우선 가계부 서비스다.

기획 원본은 docs/prompts/product-requirements.md를 기준으로 한다.

## Product Direction

- 앱 우선 개발이다.
- 1차 클라이언트는 React Native + Expo + TypeScript다.
- 웹 대시보드는 후속 확장이다.
- 백엔드는 초기에는 mock/service layer로 대체할 수 있다.
- 장기적으로는 NestJS + PostgreSQL + Prisma 구조를 고려한다.

## Core Product Goal

- 일상 가계부, 공유 정산, 여행 지출 관리를 하나의 플랫폼에서 제공한다.
- 핵심 차별점은 결제액과 실제 부담액을 분리하는 것이다.
- 일상은 가볍게, 공유는 정확하게, 여행은 똑똑하게 만든다.

## MVP Priority

1. 모바일 앱 기본 구조
2. 월간 홈 화면
3. 개인 지출 등록
4. 공유 지출 등록
5. 결제자와 실제 부담자 분리
6. 균등 분할 / 직접 금액 입력
7. ExpenseShare 자동 생성
8. 월간 요약 계산
9. 받을 돈 / 보낼 돈 계산
10. 더미 데이터 기반 검증

## First Sprint Scope

첫 번째 Sprint에서는 React Native + Expo 앱으로 다음만 구현한다.

- mock user
- 월간 홈 화면
- 지출 등록 화면
- 지출 목록 화면
- 개인 지출 등록
- 공유 지출 등록
- 균등 분할
- ExpenseShare 생성
- 결제액 / 실제 부담액 / 받을 돈 / 보낼 돈 계산
- 더미 데이터
- 로컬 상태 또는 mock repository

## Out of Scope for First Sprint

- 실제 로그인
- 실제 서버 API
- 실제 PostgreSQL 연결
- 실제 Prisma 적용
- 실제 환율 API
- 실제 OpenAI / Bedrock 연동
- 영수증 OCR
- 앱스토어 배포
- Tauri 데스크톱 앱
- 순수 웹앱 MVP
- SQLite 기반 데스크톱 로컬 앱

## Development Rules

- 먼저 docs/prompts/product-requirements.md를 읽고 작업한다.
- AGENTS.md의 앱 우선 방향을 반드시 따른다.
- Tauri / desktop-first 방향으로 계획하지 않는다.
- 웹 대시보드는 후속 확장으로만 다룬다.
- 구현 전 계획을 제시한다.
- 한 번에 전체 앱을 만들지 않는다.
- Sprint 단위로 작게 구현한다.
- 큰 리팩토링을 하지 않는다.
- main 브랜치 직접 수정 금지.
- 구현 후 실행 방법과 변경 파일을 요약한다.

## Validation Rules

- Expo 앱이 실행 가능해야 한다.
- TypeScript 오류를 남기지 않는다.
- 결제액은 paidBy 기준이다.
- 실제 소비액은 ExpenseShare 기준이다.
- 공유 지출에서 결제자와 부담자를 혼동하면 안 된다.
- MVP 범위를 넘는 기능은 만들지 않는다.

## Important Domain Rules

- 결제액 = 내가 실제로 결제한 금액
- 실제 부담액 = 정산 후 내가 부담해야 하는 금액
- 공유 지출에서는 paidBy와 ExpenseShare를 반드시 분리한다.
- 월간 홈에서는 결제 기준 금액과 실제 부담 기준 금액을 모두 보여준다.