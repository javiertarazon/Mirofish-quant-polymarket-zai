const axios = require('axios');
const config = require('../core/Config');
const logger = require('../core/Logger');
const { round } = require('../utils/number');

class TelegramService {
  constructor() {
    this.client = null;
  }

  async initialize() {
    if (!config.telegram.enabled) {
      logger.info('Telegram disabled');
      return;
    }

    if (!config.telegram.token || !config.telegram.chatId) {
      throw new Error('Telegram is enabled but TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing');
    }

    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${config.telegram.token}`,
      timeout: 10_000,
    });
    await this.client.get('/getMe');
  }

  async sendSignal(prediction) {
    if (!this.client) return { skipped: true };
    const quality = prediction.reasoning.quality || {};

    const message = [
      `MiroFish signal (${prediction.mode}) ${quality.grade ? `Grade ${quality.grade}` : ''}`,
      ``,
      `${prediction.title}`,
      `Side: ${prediction.side} ${prediction.outcome}`,
      `Entry: ${round(prediction.entryPrice, 4)}`,
      `Model probability: ${round(prediction.probability * 100, 2)}%`,
      `Market probability: ${round(prediction.marketProbability * 100, 2)}%`,
      `EV: ${round(prediction.expectedValue * 100, 2)}%`,
      `Confidence: ${round(prediction.confidence, 1)}%`,
      `Swarm: score ${round(prediction.reasoning.swarmScore, 3)} / agreement ${round(prediction.reasoning.swarmAgreement * 100, 1)}%`,
      `Stake: ${round(prediction.kellySize, 2)} USDC`,
      `Execution: ${prediction.reasoning.quality?.automaticExecutionAllowed ? 'automatic shadow' : 'manual approval required'}`,
      `Reason: ${prediction.reasoning.summary}`,
    ].join('\n');

    const { data } = await this.client.post('/sendMessage', {
      chat_id: config.telegram.chatId,
      text: message,
      disable_web_page_preview: true,
    });

    return data;
  }

  async sendCycleSummary({ stats, rejectionSummary }) {
    if (!this.client) return { skipped: true };

    const message = [
      'MiroFish cycle summary',
      '',
      `Candidates: ${stats.candidates}`,
      `Analyzed: ${stats.analyzed}`,
      `Signals: ${stats.signals}`,
      `Executed: ${stats.executed}`,
      `Queued: ${stats.queued || 0}`,
      `Rejected: ${stats.rejected}`,
      `Top rejections: ${Object.entries(rejectionSummary || {}).slice(0, 4).map(([reason, count]) => `${reason} (${count})`).join(', ') || 'none'}`,
    ].join('\n');

    const { data } = await this.client.post('/sendMessage', {
      chat_id: config.telegram.chatId,
      text: message,
      disable_web_page_preview: true,
    });

    return data;
  }
}

module.exports = { TelegramService };
