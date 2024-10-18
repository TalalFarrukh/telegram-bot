# Telegram Crypto Price Alerts Bot

This is a Telegram bot that allows users to set price alerts for various cryptocurrency tokens and get real-time price information using the CoinGecko API. Users can register with the bot, set price alerts, list their active alerts, and remove alerts.

## Features

- Register a user with the bot.
- Fetch cryptocurrency data from CoinGecko (price, market cap, 24-hour volume, etc.).
- Set price alerts for specific cryptocurrencies.
- List all active price alerts.
- Remove active price alerts.

## Prerequisites

Before running the bot, ensure that you have the following installed:

- [Node.js](https://nodejs.org/) (version 14.x or higher)
- [npm](https://www.npmjs.com/get-npm) (Node package manager)
- PostgreSQL (for storing user data and price alerts)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/crypto-price-alert-bot.git
cd crypto-price-alert-bot
```

2. Install dependencies:

```bash
npm install
```

3. Database setup:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255)
);

CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  token_symbol VARCHAR(50) NOT NULL,
  price_threshold NUMERIC(18, 2) NOT NULL
);
```

4. Set environment variables

5. Run the project:

```bash
node bot.js
```

## Available Commands

- **`/register`**  
  Register yourself with the bot.

- **`/get_token`**  
  Get cryptocurrency data by token symbol.

- **`/set_alert`**  
  Set a price alert for a token.

- **`/list_alerts`**  
  List all your active price alerts.

- **`/remove_alert`**  
  Remove an active alert by entering the alert ID.

