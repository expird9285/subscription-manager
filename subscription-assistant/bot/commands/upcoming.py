from __future__ import annotations

import nextcord
from datetime import datetime

from bot.commands._guards import ensure_allowed
from bot.utils.config import Config
from bot.utils.formatter import list_embed
from bot.utils.supabase_client import SupabaseClient


def setup(bot: nextcord.Client, config: Config, supabase: SupabaseClient) -> None:
    @bot.slash_command(
        name="결제임박",
        description="7일 내 결제 예정 구독 목록을 보여줍니다.",
        guild_ids=config.guild_ids,
    )
    async def upcoming(interaction: nextcord.Interaction) -> None:
        if not await ensure_allowed(interaction, config):
            return

        await interaction.response.defer(ephemeral=True)
        rows = await supabase.list_upcoming(
            days=7,
            today=datetime.now(config.timezone).date(),
        )
        await interaction.followup.send(
            embed=list_embed("7일 내 결제 예정", rows, "7일 내 결제 예정 구독이 없습니다."),
            ephemeral=True,
        )
