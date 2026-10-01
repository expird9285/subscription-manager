# Subscription Manager

구독 서비스의 월/연간 지출, 다음 결제일, 결제 알림을 관리하는 개인용 대시보드입니다.
**Cloudflare Workers 하나**에 웹 앱, Discord 슬래시 명령어, 결제 알림 크론이 모두 들어 있습니다.

## 구성

| 영역 | 구현 |
| --- | --- |
| 웹 앱 | [Hono](https://hono.dev) + JSX 서버 렌더링, Tailwind CSS 4 (빌드 시 정적 CSS 생성) |
| 데이터베이스 | Cloudflare D1 `subscription-manager` (APAC) |
| 로그인 | Discord OAuth2 (`identify`) → D1 세션 (HttpOnly 쿠키, 30일) |
| 접근 제어 | `ALLOWED_DISCORD_IDS`에 있는 Discord 계정만 로그인 가능 (비어 있으면 아무도 로그인할 수 없음) |
| Discord 봇 | HTTP Interactions 엔드포인트 `/discord/interactions` (Ed25519 서명 검증) |
| 결제 알림 | Cron Trigger (매시 정각) → `ALERT_HOUR`시 이후 D-7 / D-3 / D-1 / 당일 알림, 중복 발송 방지 |
| 결제수단 | 출금 계좌와 카드 등록, 계좌별 30일 출금 예정·수금 예정 합계 (`/payments`) |
| 1/N 수금 | 복사용 정산 문구 + 로그인 없이 보는 공유 링크 (`/s/:token`, 언제든 재발급·끄기) |
| 환율 | Frankfurter API를 크론에서 갱신해 D1에 저장 (페이지 렌더링은 외부 API를 기다리지 않음) |
| 도메인 | `manager.ocsar.xyz` (Workers Custom Domain) |

모든 요청은 사용자와 가까운 Cloudflare 엣지에서 처리되고 D1도 APAC에 있어서, 기존 Vercel(`iad1`)과 Supabase(서울) 사이의 왕복 지연이 없습니다.

## 결제수단과 1/N 수금

- **결제수단** 메뉴에서 출금 계좌(은행, 별칭, 계좌번호, 예금주)를 먼저 등록하고, 카드를 만들 때 연결 계좌를 고릅니다.
- 구독 수정에서 **결제 카드**를 고르면 결제 알림이 아래처럼 바뀝니다. 금액은 카드에서 빠져나가는 전체 금액입니다.

  > 3일 뒤에 **넷플릭스** 구독이 결제돼요. **현대카드**에 연결된 계좌(국민은행 월급통장)에 **17,000원** 이상 채워져 있는지 확인해 주세요.

  카드를 고르지 않은 구독은 "기타 결제 수단 메모"를 카드 이름 자리에 쓰고, 그것도 없으면 "결제 계좌에"라고 보냅니다.
- 결제수단 화면은 앞으로 30일 동안 계좌별로 빠져나갈 금액과, 1/N 구독에서 그 계좌로 받을 금액(전체 − 내 부담)을 보여줍니다.
- 1/N 구독에 **수금 계좌**를 지정하면 구독 목록의 링크 아이콘(수금 안내)에서 정산 문구를 복사하거나 공유 링크를 만들 수 있습니다.
  공유 링크에는 서비스명, 1인당 금액, 다음 결제일, 입금 계좌만 보이고 메모나 결제 카드는 보이지 않습니다.

## 처음 배포하기

### 1. 준비

```bash
npm install
npx wrangler login
```

Node.js 20 이상이 필요합니다. D1 데이터베이스는 이미 만들어져 있고 ID가 `wrangler.jsonc`에 들어 있습니다.

### 2. Discord 애플리케이션 설정

기존 봇 애플리케이션 하나로 로그인, 슬래시 명령어, 알림을 모두 처리합니다.
[Discord Developer Portal](https://discord.com/developers/applications)에서 해당 애플리케이션을 열고 아래 값을 준비합니다.

| 위치 | 할 일 | 시크릿 이름 |
| --- | --- | --- |
| General Information | Application ID 복사 | `DISCORD_CLIENT_ID` |
| General Information | Public Key 복사 | `DISCORD_PUBLIC_KEY` |
| OAuth2 | Client Secret 복사 (필요하면 Reset) | `DISCORD_CLIENT_SECRET` |
| OAuth2 → Redirects | `https://manager.ocsar.xyz/auth/callback` 추가 (로컬 개발용으로 `http://localhost:8787/auth/callback`도 추가) | – |
| Bot | Token 복사 | `DISCORD_BOT_TOKEN` |

Discord 클라이언트에서 **설정 → 고급 → 개발자 모드**를 켜고 다음 ID도 복사합니다.

- 알림을 받을 채널 ID → `DISCORD_ALERT_CHANNEL_ID`
- 로그인을 허용할 본인 사용자 ID → `ALLOWED_DISCORD_IDS` (여러 명이면 쉼표로 구분)
- (선택) 서버 ID → `wrangler.jsonc`의 `vars.DISCORD_GUILD_ID`. 넣으면 슬래시 명령어가 그 서버에만 등록되고, 비워두면 전역으로 등록됩니다.

봇이 아직 서버에 없다면 **OAuth2 → URL Generator**에서 `bot`, `applications.commands` 스코프와 `View Channels`, `Send Messages`, `Embed Links` 권한으로 초대 링크를 만들어 서버에 초대합니다.

### 3. 시크릿 등록

```bash
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put DISCORD_ALERT_CHANNEL_ID
npx wrangler secret put ALLOWED_DISCORD_IDS
```

`wrangler.jsonc`의 `secrets.required`에 있는 값이 하나라도 빠지면 `wrangler deploy`가 실패합니다.
Worker가 아직 없으면 첫 `secret put`에서 새로 만들지 물어보니 `Y`를 선택하세요.

### 4. 기존 Vercel DNS 레코드 삭제

`manager.ocsar.xyz`는 지금 Vercel을 가리키는 CNAME입니다. Custom Domain은 이미 레코드가 있는 호스트에는 연결되지 않으므로,
Cloudflare 대시보드 → `ocsar.xyz` → **DNS → Records**에서 `manager` CNAME 레코드를 먼저 삭제합니다. (배포하면 Cloudflare가 새 레코드와 인증서를 자동으로 만듭니다.)

### 5. 배포

```bash
npm run deploy
```

원격 D1에 마이그레이션을 적용하고(`migrations/`), Tailwind CSS를 빌드한 뒤 Worker를 배포합니다. 이후 코드를 바꿨을 때도 같은 명령어를 쓰면 됩니다.
GitHub 연동으로 배포하는 경우에는 아래 [자동 배포](#자동-배포-선택) 설정을 따르세요.

> 배포하면 결제 알림 크론이 바로 돌기 시작합니다. 알림이 두 번 가지 않도록 **기존 서버의 Python 봇(systemd)과 `check_billing.py` cron을 먼저 중지**하세요.

### 6. Discord 연결 마무리

1. Developer Portal → General Information → **Interactions Endpoint URL**에 `https://manager.ocsar.xyz/discord/interactions`를 넣고 저장합니다. (Discord가 서명된 PING을 보내 검증합니다.)
2. `https://manager.ocsar.xyz`에서 Discord로 로그인합니다.
3. **설정** 페이지에서 **슬래시 명령어 등록**을 누릅니다.
4. **테스트 알림 보내기**로 알림 채널을 확인합니다.

슬래시 명령어는 `/결제임박`, `/이번달`, `/구독목록`, `/상태`, `/알림테스트`입니다. 응답은 본인에게만 보이고, 명령어를 쓴 사람의 구독만 보여줍니다.

### 7. Supabase 데이터 이관 (한 번만)

```bash
SUPABASE_URL=https://ufypnmmbnzdgyfglpmwa.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
npm run export:supabase

npx wrangler d1 execute DB --remote --file=supabase-export.sql
rm supabase-export.sql
```

사용자, 구독, 알림 기록을 옮깁니다. 사용자는 Discord ID로 연결되므로 새 앱에 먼저 로그인했더라도 그 계정에 붙고, 두 번 실행해도 중복되지 않습니다.
`supabase-export.sql`에는 개인 데이터가 들어 있으니 적용 후 삭제하세요(`.gitignore`에 포함되어 있습니다).

### 8. 이전 인프라 정리

이관한 데이터를 확인한 뒤 아래를 정리합니다.

- 기존 서버의 Python 봇 파일, `backup_supabase.py` cron 삭제
- Vercel 프로젝트 삭제 또는 도메인 연결 해제
- Supabase 프로젝트 일시중지 또는 삭제

## 자동 배포 (선택)

Cloudflare 대시보드 → Workers & Pages에서 GitHub 저장소를 연결하면 `main`에 push할 때마다 배포됩니다.

| 항목 | 값 |
| --- | --- |
| 빌드 명령 | `npm run build:css` (Git 연동 빌드는 `wrangler.jsonc`의 `build.command`를 실행하지 않습니다) |
| 배포 명령 | `npx wrangler deploy` |

- 자동 생성되는 빌드용 API 토큰에는 D1 권한이 없으므로 배포 명령에 `npm run deploy`(마이그레이션 포함)를 쓰면 실패합니다.
  새 마이그레이션을 추가했을 때는 로컬에서 `npm run db:migrate:remote`를 실행하세요. (`0001_initial_schema.sql`은 이미 적용되어 있습니다.)
- 시크릿을 등록하기 전의 첫 빌드는 `Missing required secrets`로 실패합니다. Worker → **설정 → 변수 및 비밀**에서 시크릿 6개를 "비밀" 유형으로 추가한 뒤 빌드를 다시 실행하세요.

## 로컬 개발

```bash
cp .dev.vars.example .dev.vars   # 값 채우기
npm run db:migrate:local
npm run dev                      # http://localhost:8787
```

로컬 D1은 `.wrangler/`에 저장되고 운영 데이터와 분리됩니다. Discord 로그인을 로컬에서 쓰려면 `http://localhost:8787/auth/callback`이 Discord Redirects에 등록되어 있어야 합니다.
크론은 `curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+*+*+*+*"`로 직접 실행할 수 있습니다.

## 검증

```bash
npm run check                    # TypeScript + Vitest (Workers 런타임, 로컬 D1)
npx wrangler deploy --dry-run    # 번들과 바인딩 확인
```

## 설정 값

| 이름 | 종류 | 설명 |
| --- | --- | --- |
| `DB` | D1 바인딩 | `subscription-manager` 데이터베이스 |
| `TIMEZONE` | var | 오늘 날짜와 알림 시각 기준 (기본 `Asia/Seoul`) |
| `ALERT_HOUR` | var | 이 시각 이후 첫 크론에서 알림 발송 (기본 `9`) |
| `DISCORD_GUILD_ID` | var | 슬래시 명령어를 등록할 서버 ID (비우면 전역) |
| `DISCORD_CLIENT_ID` | secret | Discord Application ID |
| `DISCORD_CLIENT_SECRET` | secret | OAuth2 Client Secret |
| `DISCORD_PUBLIC_KEY` | secret | Interactions 서명 검증용 공개키 |
| `DISCORD_BOT_TOKEN` | secret | 알림 전송, 명령어 등록용 봇 토큰 |
| `DISCORD_ALERT_CHANNEL_ID` | secret | 결제 알림 채널 ID |
| `ALLOWED_DISCORD_IDS` | secret | 로그인과 봇 명령어를 허용할 Discord 사용자 ID (쉼표 구분) |

## 백업

- D1 Time Travel로 과거 시점으로 복원할 수 있습니다(무료 플랜 7일, 유료 플랜 30일): `npx wrangler d1 time-travel info DB`
- **설정 → JSON 내보내기**로 내 구독 목록을 파일로 받을 수 있습니다.

## 디렉터리 구조

```
src/
  index.tsx            Hono 앱, 라우트 연결, 크론 핸들러
  routes/              로그인/OAuth, 구독 CRUD, 설정 라우트
  views/               JSX 레이아웃, UI 컴포넌트, 페이지 (결제수단, 수금 안내, 공개 공유 페이지 포함)
  auth/                Discord OAuth, 세션 쿠키와 미들웨어
  db/                  D1 쿼리 (사용자, 세션, 구독, 알림 기록, 상태)
  discord/             Interactions 서명 검증, 명령어, 알림, REST 호출
  lib/                 날짜(타임존), 금액 계산, 환율, 입력 검증
  styles/app.css       Tailwind 입력 파일
public/                정적 파일 (빌드된 CSS, app.js, favicon)
migrations/            D1 마이그레이션
scripts/               Supabase → D1 이관 스크립트
test/                  Vitest (Workers 런타임)
```
