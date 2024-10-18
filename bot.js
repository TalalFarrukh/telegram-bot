require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { registerCommands } = require('./commands');

// Replace this token with your actual bot token from BotFather
const token = process.env.TELEGRAM_BOT_KEY;

if (!token) {
  console.error("Telegram bot token is missing! Check .env file.");
  process.exit(1); // Exit the bot if token is not present
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Register bot commands
registerCommands(bot);
