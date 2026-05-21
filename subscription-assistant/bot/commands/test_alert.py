from __future__ import annotations

from datetime import datetime

import nextcord

from bot.commands._guards import ensure_allowed
from bot.utils.config import Config
from bot.utils.supabase_client import SupabaseClient


def setup(bot: nextcord.Client, config: Config, supabase: SupabaseClient) -> None:
    @bot.slash_command(
        name="알림테스트",
        description="지정된 알림 채널에 테스트 메시지를 보냅니다.",
        guild_ids=config.guild_ids,
    )
    async def test_alert(interaction: nextcord.Interaction) -> None:
        if not await ensure_allowed(interaction, config):
            return

        await interaction.response.defer(ephemeral=True)
        channel = bot.get_channel(config.discord_alert_channel_id)
        if channel is None:
            channel = await bot.fetch_channel(config.discord_alert_channel_id)

        if not hasattr(channel, "send"):
            await interaction.followup.send("알림 채널을 찾을 수 없습니다.", ephemeral=True)
            return

        await channel.send(
            f"구독 알림 테스트입니다. {datetime.now(config.timezone).isoformat()}"
        )
        bot.last_alert_at = datetime.now(config.timezone)
        await interaction.followup.send("테스트 알림을 전송했습니다.", ephemeral=True)
