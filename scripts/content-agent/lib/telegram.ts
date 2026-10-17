import { getTelegramEnv } from './config.js';

export async function notify(text: string): Promise<void> {
  const { botToken, chatId } = getTelegramEnv();

  if (!botToken || !chatId) {
    console.warn('Telegram notify skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set.');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        link_preview_options: { is_disabled: true },
      }),
    });

    if (!response.ok) {
      console.warn(`Telegram notify failed (${response.status}).`);
    }
  } catch (error) {
    console.warn('Telegram notify failed:', error);
  }
}
