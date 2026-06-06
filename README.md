# Expense Tracker Mobile MVP - Sprint 1

React Native + Expo + TypeScript 기반 모바일 우선 가계부 MVP입니다.
Sprint 1은 mock repository / in-memory local state만 사용합니다.

## 구현 범위

- Expo + TypeScript 앱 기본 구조
- Bottom Tabs: Home, List
- Stack Modal: Add Expense
- mock current user
- dummy users / categories / expenses / ExpenseShare / shared group
- domain types
- `splitEqual`, `splitDirect`
- 결제액 계산: `Expense.paidBy` 기준
- 실제 부담액 계산: `ExpenseShare.shareAmountKRW` 기준
- 받을 돈 / 보낼 돈 계산
- 카테고리별 실제 부담 기준 요약
- mock repository
- `expenseService`, `summaryService`
- HomeScreen, ExpenseListScreen, ExpenseFormScreen
- 기본 unit test

## 실행 방법

```bash
npm install
npm start
```

Expo가 열린 뒤 iOS/Android simulator 또는 Expo Go에서 실행합니다.

## 테스트 방법

```bash
npm run typecheck
npm test
npx expo config --type public
```

현재 검증 결과:

- TypeScript typecheck 통과
- Jest 10개 테스트 통과
- Expo config 로드 통과

## Sprint 1 도메인 규칙

- 모든 Expense는 ExpenseShare를 만듭니다.
- PERSONAL도 현재 사용자 1명의 ExpenseShare를 만듭니다.
- 결제액은 `Expense.paidBy` 기준입니다.
- 실제 부담액은 `ExpenseShare` 기준입니다.
- 공유 지출에서 paidBy와 ExpenseShare를 혼동하지 않습니다.
- Sprint 1 금액은 정수 KRW만 사용합니다.

## 아직 미구현인 후속 백로그 (Sprint 1 제외)

- AsyncStorage 또는 Expo SQLite 기반 영속성
- 정산 완료 처리 UI
- 부분 정산
- 공유 그룹 관리
- 여행 생성/여행 지출
- 여행 예산 관리
- 환율 기록/API
- 여행 현금 지갑
- 혼합 통화 정산
- mock AI 여행 리포트
- 실제 AI adapter
- NestJS + PostgreSQL + Prisma 백엔드
- API repository adapter
- 웹 대시보드
