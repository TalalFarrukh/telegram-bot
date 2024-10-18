const { isUserRegistered, registerUser } = require('./services/userService');
const { getAlerts, registerPriceAlert, getUserAlerts, removeUserAlert, removeAlert } = require('./services/alerts');
const { getTokenData } = require('./services/tokenService');

let awaitingTokenInput = {};
let awaitingAlertInput = {};
let awaitingAlertIdRemoval = {};

const registerCommands = (bot) => {
  // Register Command
  bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (await isUserRegistered(userId)) {
      bot.sendMessage(chatId, 'You are already registered!');
    } else {
      const { username, first_name, last_name } = msg.from;
      const success = await registerUser(userId, username, first_name, last_name);
      bot.sendMessage(chatId, success ? 'You have been successfully registered!' : 'Registration failed. Please try again.');
      
      // If they send something else after registration, show available commands
      const commandsMessage = `Here are the available commands:\n` +
        `- /register: Register yourself with the bot.\n` +
        `- /get_token: Get cryptocurrency data by token symbol.\n` +
        `- /set_alert: Set a price alert for a token.\n` +
        `- /list_alerts: List all your active price alerts.\n` +
        `- /remove_alert: Remove an active alert by entering the alert ID.`;
      bot.sendMessage(chatId, commandsMessage);
    }
  });

  // Get Token Command
  bot.onText(/\/get_token/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!await isUserRegistered(userId)) {
      bot.sendMessage(chatId, 'Please register first using /register.');
      return;
    }

    bot.sendMessage(chatId, 'Please enter the token symbol you want to check:');
    awaitingTokenInput[userId] = true;
  });

  // Set Alert Command
  bot.onText(/\/set_alert/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!await isUserRegistered(userId)) {
      bot.sendMessage(chatId, 'Please register first using /register.');
      return;
    }

    bot.sendMessage(chatId, 'Please enter the token symbol and price threshold (e.g., bitcoin 50000):');
    awaitingAlertInput[userId] = true;
  });

  // List Alerts Command
  bot.onText(/\/list_alerts/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!await isUserRegistered(userId)) {
      bot.sendMessage(chatId, 'Please register first using /register.');
      return;
    }

    const alerts = await getUserAlerts(userId);
    if (alerts.length === 0) {
      bot.sendMessage(chatId, 'You have no active price alerts.');
    } else {
      const alertList = alerts.map(alert => 
        `Alert ID: ${alert.id}\nToken: ${alert.token_symbol.toUpperCase()}\nThreshold: $${alert.price_threshold}\n\n`).join('');
      bot.sendMessage(chatId, alertList);
    }
  });

  // Remove Alert Command
  bot.onText(/\/remove_alert/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!await isUserRegistered(userId)) {
      bot.sendMessage(chatId, 'Please register first using /register.');
      return;
    }

    bot.sendMessage(chatId, 'Please enter the Alert ID you want to remove:');
    awaitingAlertIdRemoval[userId] = true;
  });

  // Handle User Input (for tokens, alerts, etc.)
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.trim().toLowerCase();

    // Check if the user is registered
    const isRegistered = await isUserRegistered(userId);

    // If the user is not registered and they aren't trying to register, prompt them
    if (!isRegistered && !text.startsWith("/register")) {
      bot.sendMessage(
        chatId,
        "You are not registered. Please use the /register command to register."
      );
      return; // Stop further processing until they are registered
    }

    if (awaitingTokenInput[userId]) {
      const tokenData = await getTokenData(text);
      if (tokenData) {
        bot.sendMessage(
          chatId,
          `*${tokenData.name.toUpperCase()} (${tokenData.symbol.toUpperCase()})*\nPrice: $${tokenData.price}\nMarket Cap: $${tokenData.marketCap}\n24h Volume: $${tokenData.volume}\nPrice Change (24h): ${tokenData.priceChange24h}%`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(chatId, `Invalid token symbol: ${text}`);
      }
      delete awaitingTokenInput[userId];
    } else if (awaitingAlertInput[userId]) {
      const [tokenSymbol, priceThreshold] = text.split(' ');
      if (!tokenSymbol || isNaN(priceThreshold)) {
        bot.sendMessage(chatId, 'Invalid input. Please provide both the token symbol and a valid price threshold.');
        return;
      }
      const success = await registerPriceAlert(userId, tokenSymbol, parseFloat(priceThreshold));
      bot.sendMessage(chatId, success ? `Alert set for ${tokenSymbol.toUpperCase()} when price crosses $${priceThreshold}.` : 'Failed to set the alert.');
      delete awaitingAlertInput[userId];
    } else if (awaitingAlertIdRemoval[userId]) {
      const alertId = text;
      const success = await removeUserAlert(alertId, userId);
      bot.sendMessage(chatId, success ? `Alert with ID ${alertId} has been removed.` : 'Failed to remove the alert.');
      delete awaitingAlertIdRemoval[userId];
    }
  });

  // Price alert checking logic (unaffected by user interaction)
  const checkPriceAlerts = async () => {
    // Fetch all alerts from the database
    const alerts = await getAlerts();

    for (const alert of alerts.rows) {
      const tokenData = await getTokenData(alert.token_symbol);

      if (tokenData && (tokenData.price >= alert.price_threshold || tokenData.price <= alert.price_threshold)) {
        // Notify the user if price crosses the threshold
        bot.sendMessage(
          alert.user_id,
          `Price alert triggered for *${tokenData.name.toUpperCase()} (${tokenData.symbol.toUpperCase()})*!\n` +
          `Current price: $${tokenData.price}\n` +
          `Threshold: $${alert.price_threshold}`,
          { parse_mode: "Markdown" }
        );

        // Optionally, delete the alert after it's triggered
        await removeAlert(alert.id);
      }
    }
  };

  setInterval(checkPriceAlerts, 15000);
};

module.exports = { registerCommands };
