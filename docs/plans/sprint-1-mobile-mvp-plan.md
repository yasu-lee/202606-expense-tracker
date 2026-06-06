• ## Consensus 결과

  - 기준 문서: docs/AGENTS.md, docs/prompts/product-requirements.md
  - 방향: React Native + Expo + TypeScript 모바일 앱 우선
  - 첫 Sprint: mock repository / local state 기반
  - 제외: Tauri, 순수 웹앱, 실제 백엔드, PostgreSQL, Prisma, AI, 환율 API
  - Architect: ITERATE
  - Critic: APPROVE
  - 파일 수정: 없음
  - 구현 시작: 안 함

  ———

  # 1. 모바일 앱 기준 MVP 범위

  첫 Sprint MVP는 월간 홈 + 개인/공유 지출 등록 + 결제액/실제 부담액 계산 검증에 집중합니다.

  포함:

  - mock current user
  - dummy members 2~3명
  - 월간 홈 화면
  - 지출 등록 화면
  - 지출 목록 화면
  - 개인 지출 등록
  - 공유 지출 등록
  - 균등 분할
  - 직접 금액 분할
  - ExpenseShare 자동 생성
  - 결제액 계산
  - 실제 부담액 계산
  - 받을 돈 / 보낼 돈 계산
  - 카테고리별 실제 부담 기준 요약
  - mock repository 또는 local state

  제외:

  - 실제 로그인
  - 실제 서버 API
  - PostgreSQL
  - Prisma
  - Tauri
  - 순수 웹앱
  - 여행 기능
  - 혼합 통화 정산
  - 환율 API
  - AI 리포트
  - OCR
  - 앱스토어 배포

  ———

  # 2. 첫 Sprint 화면 구조

  ## HomeScreen

  월간 요약 중심.

  표시:

  - 월 선택 또는 현재 월 기본값
  - [결제 기준] / [실제 부담 기준] 토글
  - 이번 달 결제액
  - 이번 달 실제 부담액
  - 받을 돈
  - 보낼 돈
  - 카테고리별 실제 부담 요약
  - 최근 지출
  - 지출 추가 CTA

  ## ExpenseListScreen

  표시:

  - 현재 월 지출 목록
  - PERSONAL / SHARED 뱃지
  - 금액
  - 카테고리
  - 결제자
  - 내 실제 부담액
  - 받을 돈 / 보낼 돈 힌트

  ## ExpenseFormScreen

  입력:

  - 개인 / 공유 토글
  - 금액
  - 제목 또는 메모
  - 카테고리
  - 날짜
  - 결제자 paidBy

  공유 지출일 때만 추가 표시:

  - 참여자 선택
  - 분할 방식:
      - 균등 분할
      - 직접 금액 입력

  ## Navigation

  Bottom Tabs
  - Home
  - List

  Stack / Modal
  - Add Expense

  ———

  # 3. 데이터 타입

  type Currency = 'KRW';

  type ExpenseType = 'PERSONAL' | 'SHARED';

  type ExpenseContext = 'DAILY' | 'MEETING';

  type SplitMethod = 'EQUAL' | 'DIRECT';

  type SettlementStatus = 'PENDING' | 'PARTIAL' | 'DONE';

  type User = {
    id: string;
    name: string;
    defaultCurrency: Currency;
  };

  type Category = {
    id: string;
    name: string;
    color?: string;
  };

  type Expense = {
    id: string;
    title: string;
    amountKRW: number;
    currency: Currency;
    categoryId: string;
    date: string;
    paidBy: string;
    type: ExpenseType;
    context: ExpenseContext;
    memo?: string;
    createdAt: string;
    updatedAt: string;
  };

  type ExpenseShare = {
    id: string;
    expenseId: string;
    userId: string;
    shareAmountKRW: number;
    settlementStatus: SettlementStatus;
    settledAmountKRW: number;
    createdAt: string;
  };

  type CreateExpenseInput = {
    title: string;
    amountKRW: number;
    categoryId: string;
    date: string;
    paidBy: string;
    type: ExpenseType;
    context?: ExpenseContext;
    memo?: string;
    participantIds: string[];
    splitMethod: SplitMethod;
    directShares?: Array<{
      userId: string;
      shareAmountKRW: number;
    }>;
  };

  type MonthlySummary = {
    month: string;
    totalPaidKRW: number;
    actualSpentKRW: number;
    receivableKRW: number;
    payableKRW: number;
    categorySummary: Array<{
      categoryId: string;
      amountKRW: number;
    }>;
    recentExpenseIds: string[];
  };

  핵심 규칙:

  - 모든 Expense는 ExpenseShare를 만든다.
  - PERSONAL도 현재 사용자 1명의 ExpenseShare를 만든다.
  - 실제 부담액은 항상 ExpenseShare 기준이다.
  - 결제액은 항상 Expense.paidBy 기준이다.
  - 금액은 Sprint 1에서 정수 KRW만 사용한다.

  ———

  # 4. mock repository 구조

  src/domain/types.ts
  src/domain/calculations.ts
  src/domain/validation.ts
  src/domain/dummyData.ts

  src/repositories/ExpenseRepository.ts
  src/repositories/mock/mockExpenseRepository.ts

  src/services/expenseService.ts
  src/services/summaryService.ts

  src/screens/HomeScreen.tsx
  src/screens/ExpenseListScreen.tsx
  src/screens/ExpenseFormScreen.tsx

  src/navigation/AppNavigator.tsx

  Repository interface:

  interface ExpenseRepository {
    getCurrentUser(): Promise<User>;
    listUsers(): Promise<User[]>;
    listCategories(): Promise<Category[]>;
    listExpensesByMonth(month: string): Promise<Expense[]>;
    listSharesByExpenseIds(expenseIds: string[]): Promise<ExpenseShare[]>;
    createExpenseWithShares(
      input: CreateExpenseInput
    ): Promise<{ expense: Expense; shares: ExpenseShare[] }>;
  }

  원칙:

  - 화면 컴포넌트는 직접 계산하지 않는다.
  - 화면은 service/hook을 호출한다.
  - mock repository는 나중에 API repository로 교체 가능하게 만든다.
  - Sprint 1에서는 in-memory/local state만 사용한다.

  ———

  # 5. 계산 함수 목록

  splitEqual(amountKRW, participantIds)
  splitDirect(amountKRW, directShares)
  validateCreateExpenseInput(input)
  validateSplitTotal(amountKRW, shares)
  getExpensesForMonth(expenses, month)
  calculateTotalPaid(expenses, userId)
  calculateActualSpent(shares, userId)
  calculateReceivable(expenses, shares, userId)
  calculatePayable(expenses, shares, userId)
  calculateCategoryActualSummary(expenses, shares, userId)
  buildMonthlySummary(expenses, shares, userId, month)

  ## 주요 공식

  ### 결제액

  totalPaidKRW =
    sum(expense.amountKRW where expense.paidBy === currentUserId)

  ### 실제 부담액

  actualSpentKRW =
    sum(share.shareAmountKRW where share.userId === currentUserId)

  ### 받을 돈

  receivableKRW =
    sum(
      max(share.shareAmountKRW - share.settledAmountKRW, 0)
      where expense.paidBy === currentUserId
      and share.userId !== currentUserId
      and share.settlementStatus !== 'DONE'
    )

  ### 보낼 돈

  payableKRW =
    sum(
      max(share.shareAmountKRW - share.settledAmountKRW, 0)
      where expense.paidBy !== currentUserId
      and share.userId === currentUserId
      and share.settlementStatus !== 'DONE'
    )

  ### 균등 분할 나머지 처리

  예: 10,001원 / 3명

  기본 몫: 3,333원
  나머지: 2원

  stable participant order 기준:
  1번: 3,334원
  2번: 3,334원
  3번: 3,333원

  ———

  # 6. 구현 순서

  1. Expo + TypeScript 앱 스캐폴드
  2. navigation 구조 생성
  3. domain type 정의
  4. dummy users/categories/expenses/shares 작성
  5. calculation 함수 작성
  6. validation 함수 작성
  7. calculation unit test 작성
  8. mock repository 구현
  9. expenseService.createExpenseWithShares 구현
  10. summaryService.getMonthlySummary 구현
  11. HomeScreen 구현
  12. ExpenseListScreen 구현
  13. ExpenseFormScreen 개인 지출 등록 구현
  14. 공유 지출 균등 분할 구현
  15. 공유 지출 직접 금액 분할 구현
  16. UI validation/error state 추가
  17. Expo simulator/device 수동 검증

  ———

  # 7. 테스트/검증 방법

  ## 자동 검증

  - TypeScript typecheck
  - Jest unit test

  필수 테스트:

  1. 개인 지출 생성 시 현재 사용자 ExpenseShare 1개 생성
  2. 80,000 / 4 균등 분할 → 각 20,000
  3. 10,001 / 3 균등 분할 → 3,334 / 3,334 / 3,333
  4. 직접 분할 합계가 지출 금액과 같으면 통과
  5. 직접 분할 합계가 다르면 reject
  6. 내가 80,000 결제, 4명 균등 분할:
      - 결제액 80,000
      - 실제 부담액 20,000
      - 받을 돈 60,000

  7. 다른 사람이 80,000 결제, 내가 참여자:
      - 결제액 0
      - 실제 부담액 20,000
      - 보낼 돈 20,000

  8. 카테고리 요약은 결제액이 아니라 실제 부담액 기준

  ## 수동 검증

  Expo simulator/device에서 확인:

  - 앱이 Home으로 열린다.
  - 개인 지출 추가 시 결제액과 실제 부담액이 모두 증가한다.
  - 공유 지출 추가 시 결제액과 실제 부담액이 다르게 계산된다.
  - Home에서 [결제 기준] / [실제 부담 기준]을 볼 수 있다.
  - 지출 목록에서 개인/공유 뱃지가 보인다.

  ## Scope 검증

  Sprint 1에 없어야 하는 것:

  - Tauri 코드
  - 순수 웹앱 MVP
  - 실제 서버 API
  - PostgreSQL
  - Prisma
  - OpenAI/Bedrock
  - 환율 API
  - OCR

  ———

  # 8. 후속 백로그

  1. AsyncStorage 또는 Expo SQLite 기반 로컬 영속성
  2. 정산 완료 처리
  3. 부분 정산
  4. 공유 그룹
  5. 여행 생성
  6. 여행 지출 등록
  7. 여행 예산 관리
  8. 환율 기록
  9. 여행 현금 지갑
  10. 혼합 통화 정산
  11. mock AI 여행 리포트
  12. 실제 AI adapter
  13. NestJS + PostgreSQL + Prisma 백엔드
  14. API repository adapter
  15. 웹 대시보드

  ———

  ## 다음 실행 추천

  기본 구현 실행은:

  $ultragoal

  병렬로 나누려면:

  $team

  권장 병렬 lane:

  - Expo scaffold/navigation
  - domain calculation/tests
  - mock repository/services
  - screens/UI

  $ralph는 단일 owner fallback이 필요할 때만 권장합니다.