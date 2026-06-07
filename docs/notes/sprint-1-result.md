# Sprint 1 Result

## Goal

React Native + Expo + TypeScript 기반 모바일 가계부 MVP에서 결제액과 실제 부담액을 분리하는 핵심 도메인 구조를 검증한다.

## Completed

- 월간 홈 화면
- 지출 목록 화면
- 지출 추가 화면
- 개인 지출 등록
- 공유 지출 등록
- 균등 분할
- 직접 분할
- ExpenseShare 자동 생성
- 결제액 계산
- 실제 부담액 계산
- 받을 돈 / 보낼 돈 계산
- 카테고리별 실제 부담 기준 요약
- mock repository / local state
- Expo web 실행 확인

## Important Fix

공유 지출 validation을 수정했다.

기존에는 SHARED 지출에 부담자가 최소 2명 필요했지만, 대신 결제 케이스를 반영해 다음 규칙으로 변경했다.

- 부담자는 1명 이상이면 된다.
- 결제자와 부담자가 다르면 부담자 1명짜리 공유 지출도 허용한다.
- 결제자와 부담자가 동일한 1명뿐인 SHARED는 PERSONAL이어야 하므로 에러 처리한다.

## Verification

- npm run typecheck PASS
- npm test PASS
- 16 tests PASS
- Expo web 실행 확인
