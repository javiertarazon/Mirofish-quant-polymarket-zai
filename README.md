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
Este repo incluye un archivo `.env.example` para que puedas copiarlo a `.env` y completar tus claves.
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
cp .env.example .env
npm ci
npx prisma generate
npx prisma validate
npx prisma migrate dev --name init_schema
npm start
```

## 🧑‍💻 GitHub Codespaces (recomendado)

1. Abre el repo en Codespaces.
2. Copia el ejemplo de entorno y configura tus valores:
   ```bash
   cp .env.example .env
   ```
   Alternativa: configura `NEWS_API_KEY`, `API_SPORTS_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` y `DATABASE_URL` como *Codespaces Secrets*.
3. Instala dependencias y genera Prisma:
   ```bash
   npm ci
   npx prisma generate
   ```
4. Inicializa la base de datos SQLite (persistirá en el workspace del Codespace):
   ```bash
   npx prisma migrate dev --name init_schema
   ```
5. Ejecuta:
   ```bash
   npm start
   ```

## 📁 Estructura del Proyecto
```
mirofish-quant/
├── .devcontainer/        # Configuración de Codespaces/Dev Containers
├── .vscode/              # Recomendaciones de extensiones
├── src/
│   ├── services/        # Integraciones (Telegram)
│   ├── core/            # Núcleo (DB, Logger)
│   └── engine/          # Motor de predicciones y gestión de riesgo
├── __tests__/            # Tests (Jest)
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
