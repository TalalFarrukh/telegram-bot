const { query } = require('../db/db');

const isUserRegistered = async (userId) => {
  const res = await query('SELECT * FROM users WHERE user_id = $1', [userId]);
  return res.rows.length > 0;
};

const registerUser = async (userId, username, firstName, lastName) => {
  try {
    await query(
      'INSERT INTO users (user_id, username, first_name, last_name) VALUES ($1, $2, $3, $4)',
      [userId, username, firstName, lastName]
    );
    return true;
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
};

module.exports = { isUserRegistered, registerUser };
