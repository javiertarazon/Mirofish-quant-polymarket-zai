const axios = require('axios');
const config = require('../core/Config');
const logger = require('../core/Logger');
const { round } = require('../utils/number');
const {
  statusLabel,
  thesisLabel,
  translateReason,
  translateSummary,
  translateTitle,
} = require('../utils/i18n');

class TelegramService {
  constructor() {
    this.client = null;
  }

  async initialize() {
    if (!config.telegram.enabled) {
      logger.info('Telegram desactivado');
      return;
    }

    if (!config.telegram.token || !config.telegram.chatId) {
      throw new Error('Telegram esta activado pero falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID');
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
      `Señal MiroFish (${statusLabel(prediction.mode)}) ${quality.grade ? `Grado ${quality.grade}` : ''}`,
      ``,
      `${translateTitle(prediction.title)}`,
      `Tesis: ${thesisLabel(prediction.reasoning?.thesis || 'SIGNAL')}`,
      `Lado: ${statusLabel(prediction.side)} ${statusLabel(prediction.outcome)}`,
      `Entrada: ${round(prediction.entryPrice, 4)}`,
      `Probabilidad del modelo: ${round(prediction.probability * 100, 2)}%`,
      `Probabilidad del mercado: ${round(prediction.marketProbability * 100, 2)}%`,
      `Valor esperado: ${round(prediction.expectedValue * 100, 2)}%`,
      `Confianza: ${round(prediction.confidence, 1)}%`,
      `Enjambre: puntaje ${round(prediction.reasoning.swarmScore, 3)} / acuerdo ${round(prediction.reasoning.swarmAgreement * 100, 1)}%`,
      `Monto: ${round(prediction.kellySize, 2)} USDC`,
      `Ejecución: ${prediction.reasoning.quality?.automaticExecutionAllowed ? 'simulación automática' : 'requiere aprobación manual'}`,
      `Motivo: ${translateSummary(prediction.reasoning.summary)}`,
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
      'Resumen del ciclo MiroFish',
      '',
      `Candidatos: ${stats.candidates}`,
      `Analizados: ${stats.analyzed}`,
      `Señales: ${stats.signals}`,
      `Ejecutadas: ${stats.executed}`,
      `En cola: ${stats.queued || 0}`,
      `Rechazadas: ${stats.rejected}`,
      `Principales rechazos: ${Object.entries(rejectionSummary || {}).slice(0, 4).map(([reason, count]) => `${translateReason(reason)} (${count})`).join(', ') || 'ninguno'}`,
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
