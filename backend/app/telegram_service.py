"""
Telegram Bot Notification Service
Sends real-time alerts to a Telegram chat when warehouse events occur.

Configuration (via .env):
    TELEGRAM_BOT_TOKEN  - Bot token from @BotFather
    TELEGRAM_CHAT_ID    - Chat/group/channel ID to send messages to

If either value is not configured, notifications are silently skipped.
"""

import logging
import asyncio
import httpx
from typing import Optional

from .config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org/bot"

# Emoji mapping per notification type
NOTIFICATION_EMOJIS = {
    "out_of_stock":  "🔴",
    "low_stock":     "🟡",
    "expiring_soon": "⏰",
    "info":          "ℹ️",
}

NOTIFICATION_LABELS = {
    "out_of_stock":  "OUT OF STOCK",
    "low_stock":     "LOW STOCK WARNING",
    "expiring_soon": "EXPIRING SOON",
    "info":          "INFO",
}


def _is_configured() -> bool:
    """Return True if Telegram credentials are set."""
    return bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID)


async def send_telegram_message(text: str) -> bool:
    """
    Send a plain or HTML-formatted message to the configured Telegram chat.
    Returns True on success, False on failure.
    """
    if not _is_configured():
        logger.debug("Telegram not configured — skipping notification.")
        return False

    url = f"{TELEGRAM_API_BASE}{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": settings.TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                logger.info("Telegram notification sent successfully.")
                return True
            else:
                logger.warning(
                    f"Telegram API returned {response.status_code}: {response.text}"
                )
                return False
    except httpx.RequestError as exc:
        logger.error(f"Failed to send Telegram notification: {exc}")
        return False


def format_notification_message(
    notification_type: str,
    message: str,
    product_name: Optional[str] = None,
) -> str:
    """
    Format a warehouse notification into a clean Telegram HTML message.
    """
    emoji = NOTIFICATION_EMOJIS.get(notification_type, "📢")
    label = NOTIFICATION_LABELS.get(notification_type, notification_type.upper().replace("_", " "))

    lines = [
        f"{emoji} <b>[WMS ALERT] {label}</b>",
        "",
        f"📦 {message}",
        "",
        "<i>— Warehouse Management System</i>",
    ]
    return "\n".join(lines)


def send_notification_async(notification_type: str, message: str, product_name: Optional[str] = None):
    """
    Fire-and-forget: schedule a Telegram notification without blocking the caller.
    Safe to call from synchronous FastAPI route handlers.
    """
    if not _is_configured():
        return

    text = format_notification_message(notification_type, message, product_name)

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Running inside an async context (FastAPI) — schedule as a background task
            loop.create_task(send_telegram_message(text))
        else:
            # Fallback: run synchronously if no loop is active
            loop.run_until_complete(send_telegram_message(text))
    except RuntimeError:
        # No event loop — create one (rare edge case)
        asyncio.run(send_telegram_message(text))


async def test_telegram_connection() -> dict:
    """
    Test the Telegram bot connection and return status info.
    Used by the /api/notifications/telegram-test endpoint.
    """
    if not _is_configured():
        return {
            "configured": False,
            "message": "Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env"
        }

    url = f"{TELEGRAM_API_BASE}{settings.TELEGRAM_BOT_TOKEN}/getMe"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                bot_info = response.json().get("result", {})
                # Send a test message
                await send_telegram_message(
                    "✅ <b>WMS Telegram Bot Connected!</b>\n\nYour Warehouse Management System is now linked to this chat. You will receive real-time alerts here."
                )
                return {
                    "configured": True,
                    "bot_name": bot_info.get("first_name", "Unknown"),
                    "bot_username": bot_info.get("username", "Unknown"),
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "message": "Connection successful! A test message was sent to the chat."
                }
            else:
                return {
                    "configured": False,
                    "message": f"Invalid bot token. Telegram API returned: {response.status_code}"
                }
    except httpx.RequestError as exc:
        return {
            "configured": False,
            "message": f"Connection failed: {str(exc)}"
        }
