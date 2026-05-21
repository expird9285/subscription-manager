# Subscription Assistant

Personal Discord assistant for the subscription manager dashboard.

## Setup

```bash
cd subscription-assistant
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
chmod 600 .env
```

Fill `.env` with the Discord bot token, alert channel, allowed user ID, and Supabase service role key.

## Bot

```bash
python -m bot.main
```

Initial slash commands:

- `/결제임박`
- `/이번달`
- `/구독목록`
- `/상태`
- `/알림테스트`

## Cron

```cron
0 9 * * * /usr/bin/python3 /home/ubuntu/subscription-assistant/scripts/check_billing.py >> /home/ubuntu/subscription-assistant/logs/billing.log 2>&1
30 3 * * 0 /usr/bin/python3 /home/ubuntu/subscription-assistant/scripts/backup_supabase.py >> /home/ubuntu/subscription-assistant/logs/backup.log 2>&1
```

## systemd

Copy `systemd/subscription-assistant.service` to `/etc/systemd/system/`, adjust `User` and `WorkingDirectory`, then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now subscription-assistant
```
