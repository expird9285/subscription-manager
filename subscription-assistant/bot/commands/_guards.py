from __future__ import annotations

import nextcord

from bot.utils.config import Config, is_allowed_user


async def ensure_allowed(interaction: nextcord.Interaction, config: Config) -> bool:
    if is_allowed_user(interaction.user.id, config):
        return True

    await interaction.response.send_message(
        "이 명령어를 사용할 수 있는 Discord 계정이 아닙니다.",
        ephemeral=True,
    )
    return False
