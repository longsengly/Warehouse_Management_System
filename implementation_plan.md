# Telegram Notification Bot for Warehouse Management System

## Background

The WMS already has an internal notification system that creates `Notification` records in the database for:
- **Low stock** alerts
- **Out of stock** alerts
- **Expiring soon** alerts

The goal is to add a **Telegram Bot** that pushes these notifications to a Telegram chat/channel in real-time, so warehouse managers get instant alerts on their phones without needing to check the dashboard.

---

## User Review Required

> [!IMPORTANT]
> You will need to:
> 1. Create a Telegram Bot via [@BotFather](https://t.me/BotFather) and get the **Bot Token**
> 2. Get your **Chat ID** (can be a personal chat, group, or channel)
> 3. Add both to the `.env` file in your backend directory

> [!NOTE]
> The bot uses the **Telegram Bot API** via HTTP requests (no extra library needed beyond `httpx` which is already part of uvicorn's ecosystem). We'll add `httpx` to requirements.

---

## Open Questions

> [!IMPORTANT]
> **Which events should trigger a Telegram notification?**
> Currently planned: low stock, out of stock, expiring soon (matching the existing notification types). Let me know if you also want alerts for new stock-in transactions, large stock-out orders, etc.

---

## Proposed Changes

### Backend — Telegram Service

#### [NEW] `telegram_service.py`
A new module in `app/` that:
- Reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from `.env`/environment
- Provides an `async send_telegram_message(text: str)` function using `httpx`
- Provides a `send_telegram_notification(notification: Notification)` helper that formats messages with emojis per notification type

---

### Backend — Config

#### [MODIFY] [config.py](file:///c:/Users/Admin/Videos/backend/app/config.py)
Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` settings with empty defaults (disabled if not set).

---

### Backend — Inventory Notifications Hook

#### [MODIFY] [inventory.py](file:///c:/Users/Admin/Videos/backend/app/routers/inventory.py)
In `check_and_trigger_notifications()`, after creating a new `Notification` and committing to DB, call the Telegram sender **asynchronously** (fire-and-forget via `asyncio` background task) so the API response is never blocked.

---

### Backend — Requirements

#### [MODIFY] [requirements.txt](file:///c:/Users/Admin/Videos/backend/requirements.txt)
Add `httpx` for making async HTTP requests to Telegram API.

---

### Backend — Environment File

#### [NEW] `.env` (in backend root)
Template `.env` with all required variables including new Telegram ones.

---

### Frontend — Telegram Settings UI (Optional)

#### [NEW] Telegram Settings in the Admin panel
A small UI card (on the settings/notifications page, or admin profile page) where admins can see the Telegram bot connection status and enter the Chat ID directly through the app.

> [!NOTE]
> This UI portion is optional. The core functionality works with just the `.env` file. Let me know if you want the frontend settings UI as well.

---

## Implementation Steps

1. Add `httpx` to `requirements.txt`
2. Add Telegram config settings to `config.py`
3. Create `app/telegram_service.py` with send functions
4. Modify `check_and_trigger_notifications()` in `inventory.py` to call Telegram on new notifications
5. Create `.env` template with Telegram settings
6. (Optional) Add frontend Telegram bot settings UI

---

## Verification Plan

### Manual Verification
1. Set up a test Telegram bot via BotFather
2. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to `.env`
3. Trigger a low-stock situation via a stock-out transaction
4. Confirm the Telegram message arrives in the chat within seconds
5. Verify the message format looks clean with product name, SKU, and stock levels

### Automated Tests
- No automated tests required for this feature (external API integration)
- Graceful degradation: if Telegram is not configured or the request fails, the system continues working normally with only a log warning
