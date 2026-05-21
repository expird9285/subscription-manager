from __future__ import annotations

import asyncio
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from bot.utils.config import load_config
from bot.utils.formatter import due_label, subscription_line
from bot.utils.supabase_client import SupabaseClient


NOTIFICATION_TYPES = {
    7: "d7",
    3: "d3",
    1: "d1",
    0: "dday",
}


async def send_discord_message(token: str, channel_id: int, content: str) -> None:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"https://discord.com/api/v10/channels/{channel_id}/messages",
            headers={"authorization": f"Bot {token}"},
            json={"content": content},
        )
        response.raise_for_status()


async def notify_subscription(
    supabase: SupabaseClient,
    token: str,
    channel_id: int,
    subscription: dict[str, Any],
    notification_type: str,
) -> bool:
    target_date = subscription["next_billing_date"]
    exists = await supabase.notification_exists(
        subscription["id"],
        notification_type,
        target_date,
    )
    if exists:
        return False

    await send_discord_message(
        token,
        channel_id,
        f"[{due_label(target_date)}] {subscription_line(subscription)}",
    )
    await supabase.record_notification(
        subscription["id"],
        notification_type,
        target_date,
    )
    return True


async def main() -> None:
    config = load_config()
    today = datetime.now(config.timezone).date()
    supabase = SupabaseClient(config.supabase_url, config.supabase_service_role_key)
    rows = await supabase.list_upcoming(days=7, today=today)
    sent_count = 0

    for row in rows:
        days = (datetime.strptime(row["next_billing_date"], "%Y-%m-%d").date() - today).days
        notification_type = NOTIFICATION_TYPES.get(days)
        if not notification_type:
            continue
        if await notify_subscription(
            supabase,
            config.discord_bot_token,
            config.discord_alert_channel_id,
            row,
            notification_type,
        ):
            sent_count += 1

    print(f"{datetime.now(config.timezone).isoformat()} sent={sent_count}")


if __name__ == "__main__":
    asyncio.run(main())
