from __future__ import annotations

import asyncio
import json
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
    rows = await supabase.list_all()
    backup_dir = ROOT / "backups"
    backup_dir.mkdir(exist_ok=True)
    filename = backup_dir / f"subscriptions_{datetime.now(config.timezone).date().isoformat()}.json"
    filename.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"wrote {filename} rows={len(rows)}")


if __name__ == "__main__":
    asyncio.run(main())
