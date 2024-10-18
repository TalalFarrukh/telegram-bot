const axios = require('axios');

const getTokenData = async (symbol) => {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: symbol.toLowerCase(),
      },
    });
    const tokenData = response.data[0];

    if (!tokenData) return null;

    return {
      name: tokenData.name,
      symbol: tokenData.symbol,
      price: tokenData.current_price,
      marketCap: tokenData.market_cap,
      volume: tokenData.total_volume,
      priceChange24h: tokenData.price_change_percentage_24h,
    };
  } catch (error) {
    console.error('Error fetching token data:', error);
    return null;
  }
};

module.exports = { getTokenData };
