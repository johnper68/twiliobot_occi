const axios = require('axios');
require('dotenv').config();

const baseUrl = process.env.APPSHEET_BASE_URL;
const apiKey = process.env.APPSHEET_API_KEY;

const callAppSheet = async (action, tableName, rows) => {
  try {
    const res = await axios.post(`${baseUrl}`, {
      Action: action,
      ApplicationAccessKey: apiKey,
      TableName: tableName,
      Rows: rows
    });
    return res.data;
  } catch (error) {
    console.error('Error al comunicarse con AppSheet:', error.message);
    throw error;
  }
};

module.exports = { callAppSheet };