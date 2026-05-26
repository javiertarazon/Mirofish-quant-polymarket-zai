/**
 * MiroFish Quant V4.1 - Main Entry Point
 * Sistema de predicciones rentables para Polymarket
 */

require('dotenv').config({ path: './config/.env' });
const { PredictionEngine } = require('./engine/PredictionEngine');
const { TelegramService } = require('./services/TelegramService');
const { DatabaseManager } = require('./core/DatabaseManager');
const logger = require('./core/Logger');

class MiroFishQuant {
  constructor() {
    this.db = new DatabaseManager();
    this.telegram = new TelegramService();
    this.engine = new PredictionEngine();
    this.isRunning = false;
  }

  async initialize() {
    logger.info('🚀 Iniciando MiroFish Quant V4.1...');
    
    try {
      await this.db.connect();
      logger.info('✅ Base de datos conectada');
      
      await this.telegram.initialize();
      logger.info('✅ Telegram bot inicializado');
      
      await this.engine.initialize();
      logger.info('✅ Motor de predicciones listo');
      
      logger.info('🎯 Sistema listo para operar');
      return true;
    } catch (error) {
      logger.error('❌ Error en inicialización:', error);
      return false;
    }
  }

  async startTradingCycle() {
    if (!this.isRunning) {
      this.isRunning = true;
      logger.info('🔄 Iniciando ciclo de trading...');
      
      // Escanear mercados activos
      const markets = await this.engine.scanActiveMarkets();
      logger.info(`📊 Mercados encontrados: ${markets.length}`);
      
      // Generar predicciones
      for (const market of markets) {
        const prediction = await this.engine.generatePrediction(market);
        
        if (prediction && prediction.confidence >= 70) {
          logger.info(`🎯 Predicción generada: ${prediction.marketId} - Confianza: ${prediction.confidence}%`);
          
          // Guardar predicción
          await this.db.savePrediction(prediction);
          
          // Enviar señal a Telegram
          await this.telegram.sendSignal(prediction);
          
          // Ejecutar trade (shadow o real)
          if (prediction.kellySize > 0) {
            await this.engine.executeTrade(prediction);
          }
        }
      }
      
      this.isRunning = false;
      logger.info('✅ Ciclo de trading completado');
    }
  }

  async run() {
    const initialized = await this.initialize();
    
    if (!initialized) {
      logger.error('No se pudo iniciar el sistema. Saliendo...');
      process.exit(1);
    }
    
    // Ejecutar ciclo inicial
    await this.startTradingCycle();
    
    // Programar próximos ciclos (cada 30 minutos)
    setInterval(() => {
      this.startTradingCycle();
    }, 30 * 60 * 1000);
    
    logger.info('⏰ Sistema programado para ejecutar cada 30 minutos');
  }
}

// Iniciar aplicación
const app = new MiroFishQuant();
app.run().catch(console.error);
