/**
 * Standalone Telegram connectivity test — NO data fetching, NO Yahoo calls.
 *
 * Run with:  npm run test:telegram
 *
 * It sends one short message using your TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
 * so you can confirm delivery end-to-end before trusting the daily job. If the
 * credentials are missing or wrong, it prints a clear, actionable error.
 */

import "dotenv/config";
import { getTelegramConfig, isDryRun, sendMessage } from "./telegramNotifier";

async function main(): Promise<void> {
  console.log("Telegram connectivity test\n");

  if (isDryRun()) {
    console.log("DRY_RUN=true — will print instead of sending. Set DRY_RUN=false to actually send.\n");
  } else {
    const cfg = getTelegramConfig();
    if (!cfg) {
      console.error(
        "\n✗ Missing credentials. Put TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your .env file.\n" +
          "  See the README section 'Setting up the Telegram bot'.\n",
      );
      process.exit(1);
    }
    // Show a masked token so you can sanity-check it loaded, without leaking it.
    const masked = cfg.token.slice(0, 6) + "…" + cfg.token.slice(-4);
    console.log(`Using bot token ${masked} -> chat ${cfg.chatId}\n`);
  }

  const now = new Date().toISOString();
  const text =
    `✅ <b>Test message</b>\n` +
    `If you can read this in Telegram, delivery works.\n` +
    `<i>Sent ${now}</i>`;

  try {
    await sendMessage(text);
    console.log("✓ Sent. Check your Telegram chat now.\n");
  } catch (err) {
    console.error(`\n✗ Send failed: ${(err as Error).message}\n`);
    console.error(
      "Common causes:\n" +
        "  - Wrong TELEGRAM_BOT_TOKEN (check with @BotFather).\n" +
        "  - Wrong TELEGRAM_CHAT_ID.\n" +
        "  - You haven't sent your bot a message yet — open the bot in Telegram and tap Start / say hi first.\n",
    );
    process.exit(1);
  }
}

main();
