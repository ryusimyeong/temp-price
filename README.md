# 중고시세

당근·번개장터의 목록을 모아 광고·무관 상품·중복·가격 이상치를 제외하고 현재 중고 시세를 보여주는 개인용 앱입니다.

## 실행

Node.js 24와 Google Chrome이 필요합니다.

```sh
npm ci
cp .env.example .env
# .env에 단일 Turso DB의 DATABASE_URL과 DATABASE_AUTH_TOKEN 입력
npm run db:generate
npm run db:migrate
npm run dev
```

모든 실행 환경이 같은 Turso DB를 사용합니다. 로컬 DB로 자동 전환하지 않습니다.
macOS에서는 설치된 Chrome을 사용합니다. 다른 Chromium을 사용하려면 `CHROMIUM_EXECUTABLE_PATH`를 지정합니다.
Vercel에서는 `playwright-core`와 `@sparticuz/chromium`을 사용합니다.

## 기능

- 당근은 Playwright, 번개장터는 공개 HTTP 응답을 우선 사용합니다. 번개장터 응답 구조가 바뀌면 브라우저 목록 파서로 전환합니다.
- 마켓당 최대 100개, 페이지 요청 8초·마켓 15초 제한. 차단·캡차·로그인 요구를 우회하지 않습니다.
- 무료 → 광고·매입 → 무관 → 중복 → 이상치 순으로 제외하며 모든 매물을 보존합니다.
- 최저·최고·평균·중앙값·Q1·Q3는 가격 가드 이후, IQR 제외 전 표본 기준입니다. 정제평균만 IQR 이상치를 제외합니다.
- 정제 전후 표본이 각각 5개 이상일 때 통계를 제공합니다. 5~9개는 표본 경고를 표시합니다.
- 원본 판매글 링크, 마켓 필터·가격 정렬, 제외 사유별 매물 확인, 최근 검색과 가격 변화 기록을 제공합니다.
- 한쪽 수집 실패 시 다른 쪽 데이터를 제공합니다. DB 저장 실패 시 결과는 표시하지만 저장되지 않았음을 알립니다.

## 의도적으로 유지한 필터 규칙

TRD v0.2를 그대로 따르므로 용량은 선택 토큰이고, 제목에 케이스·케이블 등의 배제어가 있으면 정상 본체 판매글도 제외될 수 있습니다.
관련 토큰을 모두 포함한 다른 세부 모델이나 여러 모델을 나열한 광고가 통과할 수도 있습니다.
정확도 측정 후 규칙을 변경할 수 있도록 제외 사유와 라벨 평가 도구를 제공합니다.

당근 지역은 실제 링크로 검증한 서울 강남구 7개 동을 지원합니다. 임의 지역을 다른 지역으로 조용히 대체하지 않습니다.
상세페이지 수집·상태/배터리 분석·AI·계정·알림은 포함하지 않습니다.

## 데이터와 API

SQLite/libSQL + Prisma 7을 사용합니다. 업무 테이블은 `Search`, `Listing` 두 개이며 `_UsedPriceMigration`은 스키마 적용 이력용입니다.
`npm run db:migrate`는 원격 Turso에 최초 스키마를 트랜잭션으로 적용하고, 이미 적용된 경우 종료합니다.
`prisma.config.ts`의 파일 URL은 스키마 SQL 생성용이며 앱 데이터 저장소가 아닙니다.

| API | 기능 |
|---|---|
| `POST /api/search` | `{query, region}`으로 수집·정제·통계·저장 |
| `GET /api/searches` | 최근 50회 검색을 검색어·지역별로 묶은 기록 |
| `GET /api/searches/:id` | 저장 매물에 현재 정제 규칙을 다시 적용한 결과 |

검색 ID로 결과를 조회하므로 새로고침이 새 수집을 만들지 않습니다.
시세 변화는 동일 검색어·지역·참여 마켓 구성이며 수집이 중간에 끊기지 않은 결과끼리 비교합니다.
게시일 문자열은 표시만 하고 기간 필터나 정렬에 사용하지 않습니다.

## 검증

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run collect -- "아이폰 15 프로 256GB"
npm run accuracy
```

자동 테스트는 실제 응답 fixture를 사용하는 파서와 가격 계산에 집중합니다.
`fixtures/labeled/`의 대표 상품 5개·200개 매물은 사람의 라벨 검토가 필요합니다. 미검토 데이터를 정답으로 사용하거나 정확도 목표를 달성했다고 표시하지 않습니다.
상세 검토 방법은 해당 디렉토리 README를 참고하세요.

## 배포

Vercel 프로젝트 `ryusimyeongs-projects/temp-price`를 사용합니다. `vercel.json`에 Next.js, Node.js 24(package.json), 서울 실행 리전을 지정했습니다.
`DATABASE_URL`, `DATABASE_AUTH_TOKEN` 두 값을 모든 Vercel 대상에 동일하게 설정합니다.
마켓을 수동 중지하려면 `DISABLED_MARKETS=daangn` 또는 `daangn,bunjang`을 설정하고 재배포합니다.
환경변수와 DB 파일은 git 및 배포 소스에서 제외합니다. SQL 적용은 배포 빌드에서 자동 실행하지 않습니다.

이 앱에는 계정과 사용자별 데이터 구분이 없습니다. 개인용 프로젝트 접근 범위는 Vercel Deployment Protection으로 관리합니다.
단일 인스턴스 내 중복 검색은 409로 거절합니다. 별도 서버리스 인스턴스 사이에는 전역 잠금이 없으므로 공개 다중 사용자 서비스로 확장할 때는 수집 제한을 별도로 설계해야 합니다.
