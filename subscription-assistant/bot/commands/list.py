from __future__ import annotations

import nextcord

from bot.commands._guards import ensure_allowed
from bot.utils.config import Config
from bot.utils.formatter import list_embed
from bot.utils.supabase_client import SupabaseClient


def setup(bot: nextcord.Client, config: Config, supabase: SupabaseClient) -> None:
    @bot.slash_command(
        name="구독목록",
        description="active 또는 trial 상태의 구독 목록을 보여줍니다.",
        guild_ids=config.guild_ids,
    )
    async def list_subscriptions(interaction: nextcord.Interaction) -> None:
        if not await ensure_allowed(interaction, config):
            return

        await interaction.response.defer(ephemeral=True)
        rows = await supabase.list_active()
        await interaction.followup.send(
            embed=list_embed("활성 구독 목록", rows, "활성 구독이 없습니다."),
            ephemeral=True,
        )
