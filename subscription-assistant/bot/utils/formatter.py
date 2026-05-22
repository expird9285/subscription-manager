from __future__ import annotations

from datetime import date, datetime
from typing import Any

import nextcord


def money(amount: float | int | str, currency: str = "KRW") -> str:
    value = float(amount or 0)
    if currency == "KRW":
        return f"{value:,.0f}원"
    return f"{currency} {value:,.2f}"


def split_count(subscription: dict[str, Any]) -> int:
    try:
        count = int(subscription.get("split_count") or 1)
    except (TypeError, ValueError):
        return 1
    return count if count >= 1 else 1


def shared_price(subscription: dict[str, Any]) -> float:
    return float(subscription.get("price") or 0) / split_count(subscription)


def monthly_amount(subscription: dict[str, Any]) -> float:
    price = shared_price(subscription)
    cycle = subscription.get("billing_cycle")
    if cycle == "yearly":
        return price / 12
    if cycle == "quarterly":
        return price / 3
    if cycle == "weekly":
        return price * 52 / 12
    return price


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def days_until(value: str, today: date | None = None) -> int:
    return (parse_date(value) - (today or date.today())).days


def due_label(value: str, today: date | None = None) -> str:
    days = days_until(value, today)
    if days == 0:
        return "오늘 결제"
    if days > 0:
        return f"D-{days}"
    return f"D+{abs(days)}"


def subscription_line(subscription: dict[str, Any], today: date | None = None) -> str:
    currency = subscription.get("currency") or "KRW"
    line = (
        f"**{subscription.get('name')}** · "
        f"{money(shared_price(subscription), currency)} 내 부담 · "
        f"{subscription.get('next_billing_date')} ({due_label(subscription.get('next_billing_date'), today)})"
    )
    if split_count(subscription) > 1:
        line += (
            f" · 전체 {money(subscription.get('price', 0), currency)}"
            f" / 1/{split_count(subscription)}"
        )
    return line


def list_embed(title: str, subscriptions: list[dict[str, Any]], empty: str) -> nextcord.Embed:
    embed = nextcord.Embed(title=title, color=0x059669)
    if not subscriptions:
        embed.description = empty
        return embed

    lines = [subscription_line(subscription) for subscription in subscriptions[:20]]
    embed.description = "\n".join(lines)
    if len(subscriptions) > 20:
        embed.set_footer(text=f"외 {len(subscriptions) - 20}개 더 있음")
    return embed
