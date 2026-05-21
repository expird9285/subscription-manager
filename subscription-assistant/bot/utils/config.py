from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")


@dataclass(frozen=True)
class Config:
    discord_bot_token: str
    discord_guild_id: int | None
    discord_alert_channel_id: int
    supabase_url: str
    supabase_service_role_key: str
    allowed_discord_user_id: int | None
    timezone: ZoneInfo

    @property
    def guild_ids(self) -> list[int] | None:
        return [self.discord_guild_id] if self.discord_guild_id else None


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _optional_int(name: str) -> int | None:
    value = os.getenv(name, "").strip()
    return int(value) if value else None


def load_config() -> Config:
    timezone_name = os.getenv("TIMEZONE", "Asia/Seoul").strip() or "Asia/Seoul"
    return Config(
        discord_bot_token=_required("DISCORD_BOT_TOKEN"),
        discord_guild_id=_optional_int("DISCORD_GUILD_ID"),
        discord_alert_channel_id=int(_required("DISCORD_ALERT_CHANNEL_ID")),
        supabase_url=_required("SUPABASE_URL").rstrip("/"),
        supabase_service_role_key=_required("SUPABASE_SERVICE_ROLE_KEY"),
        allowed_discord_user_id=_optional_int("ALLOWED_DISCORD_USER_ID"),
        timezone=ZoneInfo(timezone_name),
    )


def is_allowed_user(user_id: int, config: Config) -> bool:
    return config.allowed_discord_user_id is None or user_id == config.allowed_discord_user_id
