# Requisitos de MiroFish Quant

Este documento define los requisitos tecnicos, operativos y de seguridad para ejecutar MiroFish Quant V5.

## Requisitos de sistema

- Node.js 20 o superior.
- npm 10 o superior.
- SQLite local mediante Prisma.
- Acceso HTTP saliente para consultar APIs publicas y opcionales.
- Git para versionado y publicacion.

## Instalacion local

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init_schema
```

El cargador de configuracion lee primero `config/data-apis.env` para URLs publicas y claves gratuitas/no sensibles de datos; despues lee `.env` y `config/.env` para sobrescribir valores locales o secretos. Si se usa la plantilla dentro de `config/`, copia `config/.env.example` a `config/.env`.

## Variables obligatorias

Para una simulacion local basta con:

```bash
DATABASE_URL=file:./dev.db
TRADING_MODE=shadow
ENABLE_LIVE_TRADING=false
```

El modo `shadow` es el modo seguro por defecto. Persiste predicciones y trades simulados, pero no envia ordenes reales.

## Variables recomendadas

- `BANKROLL_USDC`: capital base usado por el motor de riesgo.
- `MAX_STAKE_USDC`: stake maximo absoluto por operacion.
- `MAX_STAKE_PCT`: stake maximo como porcentaje del bankroll.
- `KELLY_FRACTION`: fraccion de Kelly usada para dimensionar posicion.
- `MAX_OPEN_TRADES`: limite de trades abiertos simultaneos.
- `MIN_LIQUIDITY`, `MIN_VOLUME`, `MAX_SPREAD`: filtros de calidad de mercado.
- `MIN_EXPECTED_VALUE`, `MIN_CONFIDENCE`: umbrales minimos de senal.
- `MIN_PROBABILITY_EDGE`, `MIN_UNDERVALUATION_GAP`: edge minimo frente al precio de entrada.
- `SPORTS_MARKETS_FOCUS=true`: consulta primero mercados con `tag_slug=sports` en Polymarket.
- `POLYMARKET_SPORTS_TAG_SLUG=sports`: slug usado para el universo deportivo de Polymarket.
- `SPORTS_TARGETS=MLB,NBA,NFL,Soccer,UFC,Boxing,F1,MotoGP`: deportes priorizados por el balanceador del ciclo. Evita que un solo deporte con mucho volumen ocupe todos los cupos.
- `HIGH_PROBABILITY_THRESHOLD`, `HIGH_CONFIDENCE_THRESHOLD`, `HIGH_SWARM_AGREEMENT_THRESHOLD`: umbrales para marcar señales deportivas grado A/A+.
- `AUTO_EXECUTE_SIGNALS=true`: ejecuta automaticamente trades `shadow`; si es `false`, las señales quedan pendientes para ejecucion manual desde el dashboard.

## APIs de datos versionadas

`config/data-apis.env` contiene las claves gratuitas/no sensibles disponibles para descarga de datos: GNews, Currents, RapidAPI, TheSportsDB y Football-Data.org. No debe contener claves privadas de Polymarket, wallet ni tokens personales.

## APIs externas opcionales

- `NEWS_API_KEY`: activa el agente de noticias y sentimiento.
- `API_SPORTS_KEY`: activa contexto de fixtures deportivos cuando aplica.
- `ODDS_API_KEY`: activa comparacion contra cuotas externas.
- `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`: activan alertas por Telegram.

Sin estas claves, el sistema sigue funcionando en modo limitado con datos publicos de Polymarket y modelos internos.

## Seguridad

- Nunca subas `.env`, `config/.env`, claves privadas ni tokens.
- `TRADING_MODE=live` no ejecuta ordenes reales en esta version. La ejecucion live esta bloqueada hasta integrar y auditar firma CLOB oficial.
- Antes de usar dinero real se requiere auditoria de limites, wallet, permisos, firma, monitoreo y procedimientos de emergencia.

## Comandos

```bash
npm start                     # Ejecuta el bot con scheduler
RUN_ONCE=true npm start       # Ejecuta una sola pasada
npm run dashboard             # Dashboard local en http://127.0.0.1:3000
npm test                      # Suite de tests
npm run reset:shadow          # Dry-run de limpieza de trades shadow abiertos
npm run reset:shadow -- --apply
npm run sources:sports        # Lista fuentes deportivas registradas
npm run report:top-sports     # Reporte de flujo top-trader deportivo
```

## Dashboard

El dashboard expone endpoints locales de solo lectura y una accion manual segura:

- `GET /api/summary`
- `GET /api/trades`
- `GET /api/predictions`
- `GET /api/markets`
- `GET /api/sources`
- `GET /api/config`
- `GET /api/cycle/status`
- `POST /api/cycle`
- `POST /api/predictions/:id/execute`

`POST /api/cycle` solo esta permitido en `TRADING_MODE=shadow` y rechaza ciclos concurrentes.
`POST /api/predictions/:id/execute` crea un trade `shadow` manual si la señal no fue ejecutada y el riesgo permite abrir otra posicion.
