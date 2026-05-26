# MiroFish Quant V4.1 - Sistema de Predicciones Rentables para Polymarket

## 🎯 Descripción
Sistema avanzado de predicciones deportivas y de eventos para Polymarket, utilizando:
- **Análisis estadístico** en tiempo real (NBA, NFL, MLB, Fútbol, UFC, Boxeo)
- **Noticias de última hora** vía NewsAPI
- **Copy Trading** de los mejores apostadores de Polymarket
- **Modelos Ensemble** con ponderación inteligente
- **Gestión de riesgo profesional** (Kelly Criterion)

## 📊 Métricas Proyectadas
- **Win Rate:** 58-65%
- **ROI Mensual:** +12% a +25%
- **Profit Factor:** 1.8-2.5
- **Max Drawdown:** 15-25%

## 🔑 Configuración Requerida

### Variables de Entorno (.env)
```
NEWS_API_KEY=tu_clave_newsapi
API_SPORTS_KEY=tu_clave_api_sports
TELEGRAM_BOT_TOKEN=tu_token_telegram
TELEGRAM_CHAT_ID=tu_chat_id
DATABASE_URL=file:./dev.db
POLYMARKET_WALLET_ADDRESS=tu_wallet_opcional
```

## 🚀 Instalación

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init_schema
npm start
```

## 📁 Estructura del Proyecto
```
mirofish-quant/
├── src/
│   ├── agents/          # Agentes de análisis (Traveler, NewsScout, TopTrader)
│   ├── services/        # Conectores externos (Polymarket, APIs)
│   ├── core/            # Núcleo del sistema (DB, Logger, Config)
│   └── engine/          # Motor de predicciones y gestión de riesgo
├── config/              # Configuraciones y .env
├── docs/                # Documentación y análisis de rentabilidad
├── tests/               # Tests unitarios y de integración
├── prisma/              # Schema de base de datos
└── package.json
```

## 🏆 Deportes Soportados
- 🏀 NBA (Baloncesto)
- 🏈 NFL (Fútbol Americano)
- ⚾ MLB (Béisbol)
- ⚽ Fútbol Soccer (Premier League, La Liga, Champions)
- 🥊 UFC/MMA
- 🥊 Boxeo

## 🤖 Copy Trading Inteligente
El sistema monitorea automáticamente las wallets de los top traders de Polymarket:
- Filtra por Win Rate > 60%
- Requiere mínimo 50 trades históricos
- Profit Factor > 1.2
- Ponderación del 25% en la predicción final

## 📡 Notificaciones
Recibe señales en tiempo real vía Telegram con:
- Mercado objetivo
- Probabilidad calculada
- Tamaño de apuesta recomendado (Kelly)
- Nivel de confianza
- Razones de la predicción

## ⚠️ Disclaimer
Este sistema es una herramienta de análisis. El trading en Polymarket conlleva riesgos. Opera responsablemente y nunca arriesgues más de lo que puedas perder.

## 📄 Licencia
MIT License
