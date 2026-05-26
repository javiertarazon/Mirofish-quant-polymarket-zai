const TelegramBot = require('node-telegram-bot-api');
const logger = require('../core/Logger');

class TelegramService {
  constructor() {
    this.enabled = false;
    this.bot = null;
    this.chatId = null;
  }

  async initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      this.enabled = false;
      return false;
    }

    this.chatId = chatId;
    this.bot = new TelegramBot(token, { polling: false });
    this.enabled = true;
    return true;
  }

  async sendSignal(prediction) {
    if (!this.enabled || !this.bot) return false;

    const text = [
      '📣 Señal MiroFish Quant',
      `Market: ${prediction.marketId}`,
      `Outcome: ${prediction.predictedOutcome}`,
      `Confianza: ${prediction.confidence}%`,
      `Kelly: ${prediction.kellySize}`,
    ].join('\n');

    try {
      await this.bot.sendMessage(this.chatId, text);
      return true;
    } catch (error) {
      logger.warn('No se pudo enviar señal a Telegram', {
        error: error && error.message ? error.message : String(error),
      });
      return false;
    }
  }
}

module.exports = { TelegramService };

