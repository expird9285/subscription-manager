from __future__ import annotations

import asyncio
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from bot.utils.config import load_config
from bot.utils.supabase_client import SupabaseClient


async def main() -> None:
    config = load_config()
    supabase = SupabaseClient(config.supabase_url, config.supabase_service_role_key)
    healthy = await supabase.health_check()
    print(f"{datetime.now(config.timezone).isoformat()} supabase={'ok' if healthy else 'fail'}")


if __name__ == "__main__":
    asyncio.run(main())
