const { query } = require('../db/db');

const getAlerts = async () => {
  return await query("SELECT * FROM alerts");
}

const registerPriceAlert = async (userId, tokenSymbol, priceThreshold) => {
  try {
    await query(
      'INSERT INTO alerts (user_id, token_symbol, price_threshold) VALUES ($1, $2, $3)',
      [userId, tokenSymbol, priceThreshold]
    );
    return true;
  } catch (error) {
    console.error('Error registering price alert:', error);
    return false;
  }
};

const getUserAlerts = async (userId) => {
  const res = await query('SELECT id, token_symbol, price_threshold FROM alerts WHERE user_id = $1', [userId]);
  return res.rows;
};

const removeUserAlert = async (alertId, userId) => {
  try {
    const res = await query('DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING *', [alertId, userId]);
    return res.rowCount > 0;
  } catch (error) {
    console.error('Error removing alert:', error);
    return false;
  }
};

const removeAlert = async (alertId) => {
  return await query("DELETE FROM alerts WHERE id = $1", [alertId]);
}

module.exports = { getAlerts, registerPriceAlert, getUserAlerts, removeUserAlert, removeAlert };
