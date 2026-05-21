from __future__ import annotations

from datetime import datetime

import nextcord
from nextcord.ext import commands

from bot.commands import list as list_command
from bot.commands import monthly, status, test_alert, upcoming
from bot.utils.config import load_config
from bot.utils.supabase_client import SupabaseClient


def create_bot() -> commands.Bot:
    config = load_config()
    intents = nextcord.Intents.default()
    bot = commands.Bot(command_prefix="!", intents=intents)
    supabase = SupabaseClient(config.supabase_url, config.supabase_service_role_key)

    bot.started_at = datetime.now(config.timezone)
    bot.last_alert_at = None

    upcoming.setup(bot, config, supabase)
    monthly.setup(bot, config, supabase)
    list_command.setup(bot, config, supabase)
    status.setup(bot, config, supabase)
    test_alert.setup(bot, config, supabase)

    @bot.event
    async def on_ready() -> None:
        print(f"Logged in as {bot.user}")

    return bot


if __name__ == "__main__":
    cfg = load_config()
    create_bot().run(cfg.discord_bot_token)
