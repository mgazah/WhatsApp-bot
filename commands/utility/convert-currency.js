/**
 * Currency Converter Command - Convert money between currencies
 */

const config = require('../../config');
const axios = require('axios');

const BASE_URL = 'https://v6.exchangerate-api.com/v6';
const API_KEY = '9c8b8532d40e5da04fac9772';

module.exports = {
  name: 'convertmoney',
  aliases: ['currency', 'convert', 'cur'],
  category: 'utility',
  description: 'Convert money from one currency to another',
  usage: '.convert <amount> <from> <to>',
  
  async execute(sock, msg, args, extra) {
    try {
      if (args.length !== 3) {
        return extra.reply(`❌ Invalid format!\n\n📌 Usage: ${config.prefix}convert 100 USD EUR`);
      }

      const amount = parseFloat(args[0]);
      const fromCurrency = args[1].toUpperCase();
      const toCurrency = args[2].toUpperCase();

      if (isNaN(amount)) {
        return extra.reply('❌ Please provide a valid amount!');
      }

      await extra.reply('⏳ Converting currency...');

      const response = await axios.get(`${BASE_URL}/${API_KEY}/latest/${fromCurrency}`);
      
      if (response.data.result === 'error') {
        throw new Error(response.data['error-type']);
      }

      const rates = response.data.conversion_rates;

      if (!rates[toCurrency]) {
        return extra.reply('❌ Invalid target currency code! Please use valid currency codes like USD, EUR, GBP, etc.');
      }

      const convertedAmount = (amount * rates[toCurrency]).toFixed(2);
      const formattedAmount = new Intl.NumberFormat().format(amount);
      const formattedResult = new Intl.NumberFormat().format(convertedAmount);

      const message = `💱 Currency Conversion\n\nFrom: ${formattedAmount} ${fromCurrency}\nTo: ${formattedResult} ${toCurrency}\nRate: 1 ${fromCurrency} = ${rates[toCurrency]} ${toCurrency}\n\nLast Updated: ${response.data.time_last_update_utc}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;

      extra.reply(message);

    } catch (error) {
      console.error('Currency conversion error:', error);
      
      if (error.message === 'unsupported-code') {
        extra.reply('❌ Invalid currency code! Please use valid currency codes like USD, EUR, GBP, etc.');
      } else if (error.message === 'malformed-request') {
        extra.reply('❌ Invalid API request format. Please try again.');
      } else if (error.message === 'invalid-key') {
        extra.reply('❌ API key validation failed. Please contact the administrator.');
      } else if (error.message === 'inactive-account') {
        extra.reply('❌ API account is not active. Please contact the administrator.');
      } else if (error.message === 'quota-reached') {
        extra.reply('❌ API quota has been reached. Please try again later.');
      } else {
        extra.reply('❌ Failed to convert currency. Please try again later.');
      }
    }
  }
};