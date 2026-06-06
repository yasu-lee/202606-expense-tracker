# Project Agent Guide

이 프로젝트는 Tauri + React + SQLite 기반 개인 가계부 MVP다.

## Product Goal
입력 피로도를 줄이는 로컬 우선 개인 가계부를 만든다.

## MVP Scope
- 거래 입력
- 거래 저장/조회
- 거래 목록
- keyword/rule 기반 카테고리 자동분류
- 월별 지출 요약
- 카테고리별 통계

## Out of Scope
- 로그인
- 서버/API 백엔드
- 클라우드 배포
- ML/LLM 자동분류
- 은행/카드사 연동
- 복잡한 예산 관리 기능

## Development Rules
- 기존 구조를 먼저 읽고 계획한 뒤 수정한다.
- 한 번에 큰 리팩토링을 하지 않는다.
- main 브랜치 직접 수정 금지.
- 기능 단위로 작게 구현한다.
- 구현 후 실행 방법/변경 파일/남은 TODO를 요약한다.

## Validation Rules
- 빌드 가능해야 한다.
- 기존 기능을 깨뜨리지 않아야 한다.
- 타입 오류를 남기지 않는다.
- 저장/조회 흐름은 직접 검증한다.
- MVP 범위를 넘는 기능은 추가하지 않는다.
