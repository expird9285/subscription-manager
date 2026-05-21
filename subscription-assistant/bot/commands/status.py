from __future__ import annotations

from datetime import datetime

import nextcord

from bot.commands._guards import ensure_allowed
from bot.utils.config import Config
from bot.utils.supabase_client import SupabaseClient


def setup(bot: nextcord.Client, config: Config, supabase: SupabaseClient) -> None:
    @bot.slash_command(
        name="상태",
        description="봇 업타임, Supabase 연결 상태, 마지막 알림 시간을 보여줍니다.",
        guild_ids=config.guild_ids,
    )
    async def status(interaction: nextcord.Interaction) -> None:
        if not await ensure_allowed(interaction, config):
            return

        await interaction.response.defer(ephemeral=True)
        healthy = False
        try:
            healthy = await supabase.health_check()
        except Exception:
            healthy = False

        now = datetime.now(config.timezone)
        started_at = getattr(bot, "started_at", now)
        uptime = now - started_at
        last_alert_at = getattr(bot, "last_alert_at", None)

        embed = nextcord.Embed(title="Subscription Assistant 상태", color=0x059669)
        embed.add_field(name="업타임", value=str(uptime).split(".")[0], inline=False)
        embed.add_field(name="Supabase", value="정상" if healthy else "오류", inline=True)
        embed.add_field(
            name="마지막 알림",
            value=last_alert_at.isoformat() if last_alert_at else "없음",
            inline=False,
        )
        await interaction.followup.send(embed=embed, ephemeral=True)
