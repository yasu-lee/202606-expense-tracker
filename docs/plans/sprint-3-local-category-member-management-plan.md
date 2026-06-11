# Sprint 3: 로컬 카테고리/멤버 관리 계획

## 1. Sprint 3 목표

로컬 SQLite 기반 개인 가계부에서 사용자가 카테고리와 로컬 멤버를 직접 관리할 수 있게 한다.

핵심 목표:

- 카테고리 추가/수정/비활성화/복구/삭제
- 로컬 멤버 추가/수정/비활성화/복구/삭제
- 거래 입력 화면에서는 활성 카테고리/멤버만 기본 선택 가능
- 기존 거래가 참조 중인 카테고리/멤버는 삭제 대신 비활성화
- 월별 요약, 카테고리 통계, 정산 계산 흐름을 깨뜨리지 않는다

## 2. 포함 기능

- 로컬 카테고리 관리
  - 카테고리 생성
  - 이름/색상 수정
  - 비활성화
  - 복구
  - 미사용 카테고리 영구 삭제

- 로컬 멤버 관리
  - 멤버 생성
  - 이름 수정
  - 비활성화
  - 복구
  - 미사용 멤버 영구 삭제

- 현재 사용자 관리
  - seed 기준 현재 사용자 유지
  - 현재 사용자는 삭제/비활성화 불가

- 거래 입력 연동
  - 신규 거래 생성 시 활성 카테고리/멤버만 표시
  - 기존 거래 수정 시, 참조 중인 비활성 카테고리/멤버는 표시 유지

- 통계/조회 연동
  - 과거 거래가 참조하는 비활성 카테고리/멤버 이름 표시 유지
  - 월별 요약/카테고리별 통계 정상 유지

## 3. 제외 기능

Sprint 3에서는 다음을 구현하지 않는다.

- 친구 초대
- 연락처/계정 기반 친구 관리
- 공유 그룹 생성/관리
- 실시간 동기화
- 로그인/회원가입
- 서버/API 백엔드
- 클라우드 저장
- 여행 기능
- 은행/카드 연동
- ML/LLM 자동분류
- 복잡한 예산 관리

## 4. DB 변경

SQLite schema version을 `1`에서 `2`로 올린다.

### users 테이블 변경

기존:

```sql
users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  default_currency TEXT NOT NULL
)
```

추가 컬럼:

```sql
is_active INTEGER NOT NULL DEFAULT 1
is_current INTEGER NOT NULL DEFAULT 0
created_at TEXT
updated_at TEXT
```

정책:

- 기존 seed 사용자들은 `is_active = 1`
- 현재 사용자 seed는 `is_current = 1`
- 기존 데이터는 삭제하지 않는다
- migration은 additive 방식으로 수행한다
- `PRAGMA table_info(users)`로 컬럼 존재 여부 확인 후 `ALTER TABLE` 실행

### categories 테이블 변경

기존:

```sql
categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT
)
```

추가 컬럼:

```sql
is_active INTEGER NOT NULL DEFAULT 1
created_at TEXT
updated_at TEXT
```

정책:

- 기존 seed 카테고리는 `is_active = 1`
- 기존 거래 참조 보존
- `expenses.category_id` FK는 유지
- 참조 중인 카테고리는 hard delete 금지

### meta

```sql
schema_version = 2
```

## 5. repository/service 변경

### domain types

`User`, `Category`에 로컬 관리용 필드를 추가한다.

```ts
type User = {
  id: UserId;
  name: string;
  defaultCurrency: Currency;
  isActive: boolean;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Category = {
  id: CategoryId;
  name: string;
  color?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
```

### Repository interface

추가/변경 API:

```ts
listUsers(options?: { includeInactive?: boolean }): Promise<User[]>;
listCategories(options?: { includeInactive?: boolean }): Promise<Category[]>;

createCategory(input): Promise<Category>;
updateCategory(input): Promise<Category>;
deactivateCategory(categoryId): Promise<Category>;
restoreCategory(categoryId): Promise<Category>;
deleteUnusedCategory(categoryId): Promise<void>;

createLocalMember(input): Promise<User>;
updateLocalMember(input): Promise<User>;
deactivateLocalMember(userId): Promise<User>;
restoreLocalMember(userId): Promise<User>;
deleteUnusedLocalMember(userId): Promise<void>;
```

### SQLite repository

- `listUsers()` / `listCategories()` 기본값은 active only
- `includeInactive: true`이면 전체 조회
- current user는 `is_current = 1` 기준으로 조회
- category 사용 여부:
  - `expenses.category_id`
- member 사용 여부:
  - `expenses.paid_by`
  - `expense_shares.user_id`
- 참조 중이면 hard delete 금지
- 참조 중이면 deactivate만 허용
- current user는 deactivate/delete 금지

### Mock repository

- `dummyUsers`, `dummyCategories`를 내부 mutable state로 복제
- SQLite repository와 동일한 동작 보장
- active/inactive 필터링
- soft deactivate / restore / hard delete 정책 동일 적용

### Service validation

공통 검증:

- 이름 trim
- 빈 이름 거부
- 활성 항목 간 중복 이름 거부
- 비활성 항목과 같은 이름으로 새 active 생성은 우선 거부
- restore 시 같은 이름의 active 항목이 있으면 거부
- 현재 사용자 deactivate/delete 거부
- 참조 중인 항목 hard delete 거부

## 6. 화면 구조

### Navigation

Bottom Tab에 관리 탭 추가:

- 홈
- 기록
- 관리

### ManageScreen

새 화면: `ManageScreen`

구성:

1. 카테고리 관리 섹션
   - active/inactive 목록 표시
   - 이름
   - 색상
   - 상태 badge
   - 수정
   - 비활성화
   - 복구
   - 삭제

2. 멤버 관리 섹션
   - active/inactive 목록 표시
   - 이름
   - 현재 사용자 badge
   - 상태 badge
   - 수정
   - 비활성화
   - 복구
   - 삭제

UX 원칙:

- MVP 범위 내에서 단순 inline form 사용
- 별도 서버/초대/계정 개념 없음
- 삭제 불가 사유는 inline error로 표시
- 현재 사용자는 명확히 표시

### ExpenseFormScreen 변경

- 신규 거래 생성:
  - active categories만 선택 가능
  - active users만 결제자/부담자로 선택 가능

- 기존 거래 수정:
  - 기존 거래가 참조하는 inactive category/user는 선택 목록에 표시
  - inactive 항목에는 badge 표시
  - 사용자가 과거 거래를 열었을 때 이름이 사라지지 않게 함

## 7. 삭제/비활성화 정책

### 카테고리

- 거래에서 참조 중이면:
  - hard delete 금지
  - deactivate 허용
  - 과거 거래/통계에는 계속 표시

- 거래에서 참조하지 않으면:
  - hard delete 허용

### 멤버

- `expenses.paid_by` 또는 `expense_shares.user_id`에서 참조 중이면:
  - hard delete 금지
  - deactivate 허용
  - 과거 정산/통계에는 계속 표시

- 참조하지 않으면:
  - hard delete 허용

### 현재 사용자

- deactivate 금지
- hard delete 금지
- restore 대상 아님

## 8. 테스트 계획

### Unit / domain

- 빈 이름 거부
- trim 처리
- active 중복 이름 거부
- inactive restore 시 active 중복 이름 있으면 거부
- current user 삭제/비활성화 거부

### Mock repository

- category create/update/deactivate/restore/delete
- member create/update/deactivate/restore/delete
- active only 조회
- includeInactive 조회
- 참조 중인 category/member hard delete 거부

### SQLite repository

- schema v2 migration
- 기존 seed 데이터 보존
- `is_active`, `is_current`, timestamp backfill
- category/member CRUD
- soft deactivate
- restore
- unused hard delete
- referenced hard delete rejection
- mock repository와 동작 parity 확인

### AppDataContext / service

- refresh 시 active 목록과 all 목록 처리 확인
- mutation 후 refresh 호출 확인
- error message 전달 확인

### Regression

- 기존 거래 저장/조회 유지
- 기존 정산 계산 유지
- 월별 요약 유지
- 카테고리별 통계 유지
- inactive category/member가 과거 거래 화면에서 사라지지 않음

## 9. 구현 순서

1. domain type 확장
   - `User`, `Category`에 active/current/timestamp 필드 추가

2. SQLite schema v2 migration
   - users/categories additive migration
   - seed/backfill 정책 적용

3. repository interface 확장
   - category/member management API 추가

4. mock repository 구현
   - SQLite와 동일 정책으로 먼저 동작 정의

5. SQLite repository 구현
   - active filtering
   - usage check
   - soft deactivate / restore / hard delete

6. service validation 추가
   - 이름 검증
   - 중복 검증
   - current user 보호
   - referenced delete 보호

7. AppDataContext 확장
   - active/all category/member state
   - management mutation methods

8. ManageScreen 추가
   - 카테고리 관리
   - 멤버 관리
   - inline error 처리

9. navigation 변경
   - Bottom Tab에 관리 탭 추가

10. ExpenseFormScreen 연동
    - create mode active only
    - edit mode referenced inactive 표시

11. 테스트 추가
    - domain/service/mock/sqlite 중심

12. 최종 검증
    - `npm run typecheck`
    - `npm test`
    - 저장/조회 수동 검증

## 10. 수동 검증 시나리오

### 카테고리

1. 관리 탭에서 새 카테고리 생성
2. 거래 입력 화면에서 새 카테고리가 보이는지 확인
3. 해당 카테고리로 거래 저장
4. 목록/상세/월별 요약에 반영되는지 확인
5. 카테고리 이름 수정
6. 기존 거래 화면에서 수정된 이름 표시 확인
7. 해당 카테고리 비활성화
8. 신규 거래 입력에서는 기본 선택 목록에서 제외되는지 확인
9. 기존 거래 상세/수정 화면에서는 inactive badge와 함께 보이는지 확인
10. 참조 중인 카테고리 hard delete가 거부되는지 확인

### 멤버

1. 관리 탭에서 새 멤버 생성
2. 공유 거래 입력 화면에서 결제자/부담자로 선택 가능한지 확인
3. 새 멤버가 포함된 공유 거래 저장
4. 정산 상세에서 멤버 이름과 금액이 정상 표시되는지 확인
5. 멤버 이름 수정
6. 기존 거래/정산 상세에 수정된 이름 표시 확인
7. 멤버 비활성화
8. 신규 거래 입력에서는 기본 선택 목록에서 제외되는지 확인
9. 기존 거래 수정 화면에서는 참조 중인 inactive 멤버가 표시되는지 확인
10. 참조 중인 멤버 hard delete가 거부되는지 확인

### 현재 사용자 보호

1. 현재 사용자에 비활성화 시도
2. 실패 메시지 확인
3. 현재 사용자 삭제 시도
4. 실패 메시지 확인

### 회귀 검증

1. 개인 거래 생성
2. 공유 거래 생성
3. 직접 분할 거래 생성
4. 정산 일부 완료
5. 거래 수정
6. 거래 삭제
7. 월별 요약/카테고리 통계 확인
8. 앱 재시작 후 SQLite 데이터 유지 확인
