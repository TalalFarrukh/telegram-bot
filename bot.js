const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const { query } = require("./db");

// Replace this token with your actual bot token from BotFather
const token = process.env.TELEGRAM_BOT_KEY;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

const awaitingTokenInput = {};
const awaitingAlertInput = {};
const awaitingAlertIdRemoval = {};

// Function to check if a user is registered (unchanged)
const isUserRegistered = async (userId) => {
  const res = await query("SELECT * FROM users WHERE user_id = $1", [userId]);
  return res.rows.length > 0;
};

// Function to register a price alert in the database
const registerPriceAlert = async (userId, tokenSymbol, priceThreshold) => {
  try {
    await query(
      "INSERT INTO alerts (user_id, token_symbol, price_threshold) VALUES ($1, $2, $3)",
      [userId, tokenSymbol, priceThreshold]
    );
    return true;
  } catch (error) {
    console.error("Error registering price alert:", error);
    return false;
  }
};

// Function to register a new user (unchanged)
const registerUser = async (userId, username, firstName, lastName) => {
  try {
    await query(
      "INSERT INTO users (user_id, username, first_name, last_name) VALUES ($1, $2, $3, $4)",
      [userId, username, firstName, lastName]
    );
    return true;
  } catch (error) {
    console.error("Error registering user:", error);
    return false;
  }
};

// Command to register the user (unchanged)
bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;
  const lastName = msg.from.last_name;

  const isRegistered = await isUserRegistered(userId);

  if (isRegistered) {
    bot.sendMessage(chatId, "You are already registered!");
  } else {
    const success = await registerUser(userId, username, firstName, lastName);
    if (success) {
      bot.sendMessage(chatId, "You have been successfully registered!");
    } else {
      bot.sendMessage(chatId, "Registration failed. Please try again.");
    }
  }
});

// Fetch token data from CoinGecko API
const getTokenData = async (symbol) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/markets`,
      {
        params: {
          vs_currency: "usd", // get token data in USD
          ids: symbol.toLowerCase(), // CoinGecko uses lowercase for tokens
        },
      }
    );
    const tokenData = response.data[0]; // Get first result (if exists)

    if (!tokenData) return null; // If no token found

    return {
      name: tokenData.name,
      symbol: tokenData.symbol,
      price: tokenData.current_price,
      marketCap: tokenData.market_cap,
      volume: tokenData.total_volume,
      priceChange24h: tokenData.price_change_percentage_24h,
    };
  } catch (error) {
    console.error("Error fetching token data:", error);
    return null;
  }
};

// Command to initiate the token query process
bot.onText(/\/get_token/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Check if the user is registered
  const isRegistered = await isUserRegistered(userId);

  if (!isRegistered) {
    bot.sendMessage(chatId, "Please register first using /register.");
    return;
  }

  // Prompt the user to enter the token symbol
  bot.sendMessage(chatId, "Please enter the token symbol you want to check:");

  // Mark the user as awaiting input for token symbol
  awaitingTokenInput[userId] = true;
});

// Command to initiate the price alert setup
bot.onText(/\/set_alert/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Check if the user is registered
  const isRegistered = await isUserRegistered(userId);

  if (!isRegistered) {
    bot.sendMessage(chatId, "Please register first using /register.");
    return;
  }

  // Prompt the user to enter the token symbol and price threshold
  bot.sendMessage(
    chatId,
    "Please enter the token symbol and price threshold (e.g., bitcoin 50000):"
  );

  // Mark the user as awaiting input for alert symbol and price
  awaitingAlertInput[userId] = true;
});

// Command to list all active alerts for the user
bot.onText(/\/list_alerts/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Check if the user is registered
  const isRegistered = await isUserRegistered(userId);

  if (!isRegistered) {
    bot.sendMessage(chatId, "Please register first using /register.");
    return;
  }

  // Fetch all alerts for the user
  const res = await query(
    "SELECT id, token_symbol, price_threshold FROM alerts WHERE user_id = $1",
    [userId]
  );

  if (res.rows.length === 0) {
    bot.sendMessage(chatId, "You have no active price alerts.");
  } else {
    let alertList = "Your active price alerts:\n";
    res.rows.forEach((alert) => {
      alertList += `Alert ID: ${
        alert.id
      }\nToken: ${alert.token_symbol.toUpperCase()}\nThreshold: $${
        alert.price_threshold
      }\n\n`;
    });

    bot.sendMessage(chatId, alertList);
  }
});

bot.onText(/\/remove_alert (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const alertId = match[1].trim();

  // Check if the user is registered
  const isRegistered = await isUserRegistered(userId);

  if (!isRegistered) {
    bot.sendMessage(chatId, "Please register first using /register.");
    return;
  }

  // Delete the alert if it belongs to the user
  try {
    const res = await query(
      "DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING *",
      [alertId, userId]
    );

    if (res.rowCount === 0) {
      bot.sendMessage(
        chatId,
        "No alert found with the given ID, or it doesn’t belong to you."
      );
    } else {
      bot.sendMessage(
        chatId,
        `Alert with ID ${alertId} has been successfully removed.`
      );
    }
  } catch (error) {
    console.error("Error removing alert:", error);
    bot.sendMessage(chatId, "Failed to remove the alert. Please try again.");
  }
});

// Command to initiate the alert removal process
bot.onText(/\/remove_alert/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Check if the user is registered
  const isRegistered = await isUserRegistered(userId);

  if (!isRegistered) {
    bot.sendMessage(chatId, "Please register first using /register.");
    return;
  }

  // Prompt the user to enter the alert ID they want to remove
  bot.sendMessage(chatId, "Please enter the Alert ID you want to remove:");

  // Mark the user as awaiting input for the alert ID
  awaitingAlertIdRemoval[userId] = true;
});

// Handle token symbol input
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim().toLowerCase();

  // Check if the user is in the process of entering a token symbol
  if (awaitingTokenInput[userId]) {
    // Fetch token data from CoinGecko
    const tokenData = await getTokenData(text);

    if (!tokenData) {
      bot.sendMessage(chatId, `Invalid token symbol: ${text}`);
    } else {
      bot.sendMessage(
        chatId,
        `*${tokenData.name.toUpperCase()} (${tokenData.symbol.toUpperCase()})*\n` +
          `Price: $${tokenData.price}\n` +
          `Market Cap: $${tokenData.marketCap}\n` +
          `24h Volume: $${tokenData.volume}\n` +
          `Price Change (24h): ${tokenData.priceChange24h}%`,
        { parse_mode: "Markdown" }
      );
    }

    // Reset the awaiting input status after processing
    delete awaitingTokenInput[userId];
  } else if (awaitingAlertInput[userId]) {
    // Split the input text into two parts: token symbol and price threshold
    const [tokenSymbol, priceThreshold] = text.split(" ");

    if (!tokenSymbol || isNaN(priceThreshold)) {
      bot.sendMessage(
        chatId,
        "Invalid input. Please provide both the token symbol and a valid price threshold (e.g., bitcoin 50000)."
      );
      return;
    }

    // Register the price alert in the database
    const success = await registerPriceAlert(
      userId,
      tokenSymbol,
      parseFloat(priceThreshold)
    );

    if (success) {
      bot.sendMessage(
        chatId,
        `Alert set for ${tokenSymbol.toUpperCase()} when price crosses $${priceThreshold}.`
      );
    } else {
      bot.sendMessage(chatId, "Failed to set the alert. Please try again.");
    }

    // Reset awaiting input after processing
    delete awaitingAlertInput[userId];
  }
  // Check if the user is in the process of entering an alert ID for removal
  else if (awaitingAlertIdRemoval[userId]) {
    const alertId = text;

    try {
      // Delete the alert if it belongs to the user
      const res = await query(
        "DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING *",
        [alertId, userId]
      );

      if (res.rowCount === 0) {
        bot.sendMessage(
          chatId,
          "No alert found with the given ID, or it doesn’t belong to you."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Alert with ID ${alertId} has been successfully removed.`
        );
      }
    } catch (error) {
      console.error("Error removing alert:", error);
      bot.sendMessage(chatId, "Failed to remove the alert. Please try again.");
    }

    // Reset awaiting input after processing
    delete awaitingAlertIdRemoval[userId];
  } else {
    // Skip processing /register or any other command
    if (
      msg.text.toLowerCase().startsWith("/register") ||
      msg.text.toLowerCase().startsWith("/get_token")
    )
      return;

    // Check if the user is registered
    const isRegistered = await isUserRegistered(userId);

    if (isRegistered) {
      bot.sendMessage(chatId, "Welcome! You can now interact with the bot.");
    } else {
      bot.sendMessage(chatId, "Please register first using /register.");
    }
  }
});

// Periodically check prices and notify users if thresholds are crossed
const checkPriceAlerts = async () => {
  const alerts = await query("SELECT * FROM alerts"); // Fetch all alerts

  for (const alert of alerts.rows) {
    const tokenData = await getTokenData(alert.token_symbol);

    if (tokenData && tokenData.price >= alert.price_threshold) {
      // Notify the user if price crosses the threshold
      bot.sendMessage(
        alert.user_id,
        `Price alert triggered for *${tokenData.name.toUpperCase()} (${tokenData.symbol.toUpperCase()})*!\n` +
          `Current price: $${tokenData.price}\n` +
          `Threshold: $${alert.price_threshold}`,
        { parse_mode: "Markdown" }
      );

      // Optionally, delete the alert after it's triggered
      await query("DELETE FROM alerts WHERE id = $1", [alert.id]);
    }
  }
};

// Run the checkPriceAlerts function every minute (or any desired interval)
setInterval(checkPriceAlerts, 10000);
