from __future__ import annotations

import nextcord
from datetime import datetime

from bot.commands._guards import ensure_allowed
from bot.utils.config import Config
from bot.utils.formatter import list_embed, money
from bot.utils.supabase_client import SupabaseClient


def setup(bot: nextcord.Client, config: Config, supabase: SupabaseClient) -> None:
    @bot.slash_command(
        name="이번달",
        description="이번 달 결제 예정 구독과 총액을 보여줍니다.",
        guild_ids=config.guild_ids,
    )
    async def monthly(interaction: nextcord.Interaction) -> None:
        if not await ensure_allowed(interaction, config):
            return

        await interaction.response.defer(ephemeral=True)
        rows = await supabase.list_this_month(
            today=datetime.now(config.timezone).date(),
        )
        totals: dict[str, float] = {}
        for row in rows:
            currency = row.get("currency") or "KRW"
            totals[currency] = totals.get(currency, 0) + float(row.get("price") or 0)

        embed = list_embed("이번 달 결제 예정", rows, "이번 달 결제 예정 구독이 없습니다.")
        if totals:
            embed.add_field(
                name="총액",
                value=" / ".join(money(total, currency) for currency, total in totals.items()),
                inline=False,
            )
        await interaction.followup.send(embed=embed, ephemeral=True)
