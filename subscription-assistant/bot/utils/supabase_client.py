from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import httpx


class SupabaseClient:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": service_role_key,
            "authorization": f"Bearer {service_role_key}",
            "content-type": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | list[tuple[str, Any]] | None = None,
        json: Any | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> Any:
        headers = {**self.headers, **(extra_headers or {})}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(
                method,
                f"{self.url}/rest/v1/{path}",
                headers=headers,
                params=params,
                json=json,
            )
            response.raise_for_status()
            if response.status_code == 204 or not response.content:
                return None
            return response.json()

    async def health_check(self) -> bool:
        await self._request(
            "GET",
            "subscriptions",
            params={"select": "id", "limit": "1"},
        )
        return True

    async def list_active(self) -> list[dict[str, Any]]:
        return await self._request(
            "GET",
            "subscriptions",
            params={
                "select": "*",
                "status": "in.(active,trial)",
                "order": "next_billing_date.asc",
            },
        )

    async def list_upcoming(self, days: int = 7, today: date | None = None) -> list[dict[str, Any]]:
        base = today or date.today()
        end = base + timedelta(days=days)
        return await self._request(
            "GET",
            "subscriptions",
            params=[
                ("select", "*"),
                ("status", "in.(active,trial)"),
                ("auto_renew", "eq.true"),
                ("next_billing_date", f"gte.{base.isoformat()}"),
                ("next_billing_date", f"lte.{end.isoformat()}"),
                ("order", "next_billing_date.asc"),
            ],
        )

    async def list_this_month(self, today: date | None = None) -> list[dict[str, Any]]:
        base = today or date.today()
        next_month = date(base.year + int(base.month == 12), 1 if base.month == 12 else base.month + 1, 1)
        start = date(base.year, base.month, 1)
        end = next_month - timedelta(days=1)
        return await self._request(
            "GET",
            "subscriptions",
            params=[
                ("select", "*"),
                ("status", "in.(active,trial,cancel_pending)"),
                ("next_billing_date", f"gte.{start.isoformat()}"),
                ("next_billing_date", f"lte.{end.isoformat()}"),
                ("order", "next_billing_date.asc"),
            ],
        )

    async def list_all(self) -> list[dict[str, Any]]:
        return await self._request(
            "GET",
            "subscriptions",
            params={"select": "*", "order": "next_billing_date.asc"},
        )

    async def notification_exists(
        self,
        subscription_id: str,
        notification_type: str,
        target_date: str,
    ) -> bool:
        rows = await self._request(
            "GET",
            "notification_logs",
            params={
                "select": "id",
                "subscription_id": f"eq.{subscription_id}",
                "notification_type": f"eq.{notification_type}",
                "target_date": f"eq.{target_date}",
                "limit": "1",
            },
        )
        return bool(rows)

    async def record_notification(
        self,
        subscription_id: str,
        notification_type: str,
        target_date: str,
    ) -> None:
        await self._request(
            "POST",
            "notification_logs",
            json={
                "subscription_id": subscription_id,
                "notification_type": notification_type,
                "target_date": target_date,
            },
            extra_headers={"prefer": "return=minimal"},
        )
