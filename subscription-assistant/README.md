# Subscription Assistant 봇 설정 가이드

구독 관리 대시보드의 결제 예정 항목을 Discord에서 확인하고, 지정 채널로 결제 알림을 보내는 개인용 Discord 봇입니다.

## 1. Discord 앱 만들기

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 **New Application**을 만듭니다.
2. 앱의 **Bot** 메뉴에서 봇을 생성하고 **Reset Token** 또는 **Copy Token**으로 토큰을 복사합니다.
3. 복사한 토큰은 `DISCORD_BOT_TOKEN`에 넣습니다. 토큰은 비밀번호처럼 취급하고 Git에 커밋하지 마세요.
4. 앱의 **Installation** 또는 **OAuth2** 설정에서 서버 설치 링크를 만듭니다.
5. 설치 범위에는 `bot`, `applications.commands`를 포함합니다.
6. 봇 권한에는 최소한 다음 권한을 부여합니다.
   - View Channels
   - Send Messages
   - Use Slash Commands
   - Embed Links

이 봇은 WebSocket 기반으로 Discord에 접속하고 슬래시 명령어를 등록하므로, 공식 Discord 문서 기준으로 봇 토큰과 `applications.commands` 스코프가 필요합니다.

## 2. Discord ID 확인하기

Discord 클라이언트에서 **User Settings > Advanced > Developer Mode**를 켭니다.

- 서버 ID: 서버 이름을 우클릭한 뒤 **Copy Server ID**를 선택합니다. `DISCORD_GUILD_ID`에 넣습니다.
- 알림 채널 ID: 알림을 받을 채널을 우클릭한 뒤 **Copy Channel ID**를 선택합니다. `DISCORD_ALERT_CHANNEL_ID`에 넣습니다.
- 허용 사용자 ID: 봇 명령어를 사용할 본인 계정을 우클릭한 뒤 **Copy User ID**를 선택합니다. `ALLOWED_DISCORD_USER_ID`에 넣습니다.

`DISCORD_GUILD_ID`를 설정하면 슬래시 명령어가 해당 서버 기준으로 등록되어 반영이 빠릅니다. 비워두면 전역 명령어로 등록될 수 있어 Discord 반영까지 시간이 더 걸릴 수 있습니다.

## 3. Supabase 키 준비하기

봇은 결제 예정 구독 목록을 읽고 알림 발송 기록을 남기기 위해 Supabase Service Role Key를 사용합니다.

1. Supabase 프로젝트 대시보드에서 **Project Settings > API**로 이동합니다.
2. Project URL을 `SUPABASE_URL`에 넣습니다.
3. Service Role Key를 `SUPABASE_SERVICE_ROLE_KEY`에 넣습니다.

Service Role Key는 RLS를 우회할 수 있는 서버 전용 키입니다. 로컬 `.env`, 서버 환경변수, 비밀 저장소에만 보관하세요.

## 4. 로컬 환경 설정

```bash
cd subscription-assistant
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
chmod 600 .env
```

Windows PowerShell에서는 다음처럼 실행합니다.

```powershell
cd subscription-assistant
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

`.env` 예시:

```env
DISCORD_BOT_TOKEN=디스코드_봇_토큰
DISCORD_GUILD_ID=서버_ID
DISCORD_ALERT_CHANNEL_ID=알림_채널_ID
SUPABASE_URL=https://ufypnmmbnzdgyfglpmwa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=Supabase_service_role_key
ALLOWED_DISCORD_USER_ID=본인_Discord_사용자_ID
TIMEZONE=Asia/Seoul
```

`ALLOWED_DISCORD_USER_ID`를 비워두면 모든 사용자가 봇 슬래시 명령어를 실행할 수 있으므로 개인용 서버가 아니라면 반드시 설정하세요.

## 5. 봇 실행하기

```bash
python -m bot.main
```

정상 실행되면 터미널에 다음과 비슷한 로그가 표시됩니다.

```text
Logged in as ...
```

Discord 서버에서 `/`를 입력해 아래 명령어가 보이는지 확인합니다.

- `/결제임박`: 7일 내 결제 예정 구독 목록
- `/이번달`: 이번 달 결제 예정 구독과 총액
- `/구독목록`: 활성 또는 체험 중인 구독 목록
- `/상태`: 봇 업타임, Supabase 연결 상태, 마지막 알림 시간
- `/알림테스트`: 설정된 알림 채널로 테스트 메시지 전송

처음 실행 직후 명령어가 보이지 않으면 봇을 재초대했는지, 초대 링크에 `applications.commands` 스코프가 포함되어 있는지, `DISCORD_GUILD_ID`가 올바른지 확인하세요.

## 6. 결제 알림 스케줄 설정

결제 알림은 봇 프로세스와 별개로 `scripts/check_billing.py`를 주기 실행해서 보냅니다. 이 스크립트는 결제일 7일 전, 3일 전, 1일 전, 당일 알림을 보내고 `notification_logs`에 기록해 중복 발송을 막습니다.

Linux 서버에서는 cron을 사용할 수 있습니다.

```cron
0 9 * * * /home/ubuntu/subscription-assistant/.venv/bin/python /home/ubuntu/subscription-assistant/scripts/check_billing.py >> /home/ubuntu/subscription-assistant/logs/billing.log 2>&1
30 3 * * 0 /home/ubuntu/subscription-assistant/.venv/bin/python /home/ubuntu/subscription-assistant/scripts/backup_supabase.py >> /home/ubuntu/subscription-assistant/logs/backup.log 2>&1
```

로그 디렉터리가 없다면 먼저 만듭니다.

```bash
mkdir -p logs
```

## 7. systemd로 상시 실행하기

Ubuntu 서버에서 봇을 계속 실행하려면 `systemd/subscription-assistant.service`를 복사해서 사용합니다.

```bash
sudo cp systemd/subscription-assistant.service /etc/systemd/system/subscription-assistant.service
sudo systemctl daemon-reload
sudo systemctl enable --now subscription-assistant
```

서버 경로 또는 사용자가 다르면 서비스 파일의 `User`, `WorkingDirectory`, `ExecStart`를 실제 값에 맞게 수정하세요.

상태와 로그 확인:

```bash
sudo systemctl status subscription-assistant
journalctl -u subscription-assistant -f
```

## 8. 문제 해결 체크리스트

- `Missing required environment variable`: `.env` 파일이 `subscription-assistant/.env` 위치에 있는지, 필수 값이 비어 있지 않은지 확인합니다.
- 슬래시 명령어가 안 보임: 봇 초대 링크에 `applications.commands`가 포함되어 있는지 확인하고, `DISCORD_GUILD_ID`를 설정한 뒤 봇을 재시작합니다.
- `/알림테스트`가 실패함: `DISCORD_ALERT_CHANNEL_ID`가 채널 ID인지, 봇이 해당 채널을 볼 수 있고 메시지를 보낼 수 있는지 확인합니다.
- Supabase가 오류로 표시됨: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 올바른지 확인합니다.
- 특정 사용자만 쓰게 하고 싶음: `ALLOWED_DISCORD_USER_ID`에 본인 Discord 사용자 ID를 설정합니다.

## 참고 문서

- [Discord Bots 공식 문서](https://discord.com/developers/docs/bots)
- [Discord OAuth2 and Permissions 공식 문서](https://docs.discord.com/developers/platform/oauth2-and-permissions)
- [Discord Application Commands 공식 문서](https://docs.discord.com/developers/interactions/application-commands)
