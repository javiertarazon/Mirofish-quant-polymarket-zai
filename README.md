# MiroFish Quant V5

Bot cuantitativo para Polymarket con escaneo de mercados activos, lectura de orderbooks públicos, generación de señales, gestión de riesgo y ejecución `shadow` persistida en SQLite.

## Estado

El bot es operativo en modo simulación. El modo real queda bloqueado de forma deliberada hasta configurar y auditar firma CLOB, wallet, permisos y límites operativos. No hay garantía de rentabilidad; úsalo primero para backtesting, paper trading y monitoreo.

## Qué hace

- Lee eventos activos desde Gamma API.
- Lee orderbooks desde CLOB API pública.
- Ejecuta un enjambre de agentes para enriquecer la señal.
- Filtra por liquidez, volumen, spread, EV, edge y confianza.
- Calcula tamaño de posición con Kelly fraccionado y límites de pérdida.
- Guarda mercados, predicciones, alertas y trades shadow en SQLite.
- Envía señales por Telegram si se configura.
- Expone un dashboard local para monitoreo y ejecución manual segura de ciclos `shadow`.

## Documentación

- [Requisitos técnicos y operativos](docs/REQUIREMENTS.md)
- [Explicación completa del sistema](docs/SYSTEM_OVERVIEW.md)

## Instalación

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init_schema
npm start
```

Dashboard local:

```bash
npm run dashboard
```

Abre `http://127.0.0.1:3000`. El botón de ejecución manual lanza un ciclo solo si `TRADING_MODE=shadow`.

Para ejecutar una sola pasada:

```bash
RUN_ONCE=true npm start
```

Para revisar o limpiar trades `shadow` abiertos de una simulación local:

```bash
npm run reset:shadow
npm run reset:shadow -- --apply
```

El primer comando solo muestra un `dry-run`; el segundo marca los trades `shadow` abiertos como `CANCELLED`.

Para comprobar flujo reciente de top traders en mercados deportivos:

```bash
npm run report:top-sports
```

Para listar las fuentes oficiales, externas y de odds registradas por deporte:

```bash
npm run sources:sports
```

## Estructura

```
mirofish-quant/
├── src/
│   ├── core/            # Config, logger, Prisma
│   ├── agents/          # Enjambre de agentes
│   ├── services/        # Polymarket, deportes, noticias, odds y Telegram
│   ├── engine/          # Señales, riesgo y ejecución shadow
│   ├── ui/              # Servidor del dashboard
│   └── utils/           # Utilidades
├── public/              # Dashboard web
├── docs/                # Requisitos y explicación del sistema
├── config/              # .env.example y .env local
├── tests/               # Tests unitarios y de integración
├── prisma/              # Schema de base de datos
└── package.json
```

## Variables clave

La app carga primero `config/data-apis.env`, un archivo versionable con URLs públicas y claves gratuitas/no sensibles para datos estadísticos; después carga `.env` y `config/.env` para sobrescribir valores locales o secretos.

Edita `.env`:

- `TRADING_MODE=shadow`: modo seguro por defecto.
- `BANKROLL_USDC`, `MAX_STAKE_USDC`, `MAX_STAKE_PCT`: límites de riesgo.
- `MIN_LIQUIDITY`, `MIN_VOLUME`, `MAX_SPREAD`: filtros de calidad.
- `MIN_PROBABILITY_EDGE`, `MIN_UNDERVALUATION_GAP`: diferencia mínima entre probabilidad del modelo y probabilidad implícita de entrada.
- `TOP_TRADER_MIN_EFFECTIVENESS`, `TOP_TRADER_MIN_MONTHLY_VOLUME`, `TOP_TRADER_MIN_RELEVANT_NOTIONAL`: filtros de whale tracking usando datos públicos de Polymarket.
- `TELEGRAM_ENABLED`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: alertas.

Consulta [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) para la lista completa.

## Enjambre de agentes

El sistema tiene una capa multiagente activada por `SWARM_ENABLED=true`:

- `news_sentiment`: consulta NewsAPI y mide sentimiento de titulares/descripciones.
- `sports_context`: estima local/visitante, distancia de viaje y contexto de fixture si API-Sports está configurado.
- `top_traders`: consulta leaderboard y trades públicos de Polymarket; filtra whales por efectividad `PnL / volumen`, volumen mensual y notional relevante.
- `holder_concentration`: consulta holders por mercado para detectar concentración excesiva.
- `market_mood`: mide skew de profundidad, liquidez y spread desde el orderbook.
- `external_odds`: compara el precio de Polymarket contra cuotas externas si The Odds API está configurada.

Cada agente devuelve `score`, `confidence`, `probabilityShift`, notas y datos. El `SwarmOrchestrator` combina los votos con pesos configurables y ajusta la probabilidad final dentro de `MAX_SWARM_PROBABILITY_SHIFT`.

Deportes cubiertos por fuentes registradas:

- MLB/baseball: MLB Stats API, MLB.com, Baseball Savant.
- NBA: NBA Stats y NBA News.
- NFL: NFL Stats y Next Gen Stats.
- Fútbol/soccer: FIFA, Premier League, UEFA, LaLiga.
- Formula 1: FIA y Formula1.com.
- MotoGP: MotoGP results, stats y news.
- UFC/MMA: UFC Stats, UFC rankings y UFC News.
- Boxeo: BoxRec, WBA, WBC, IBF y WBO.

APIs de datos incluidas en `config/data-apis.env`:

- `GNEWS_API_KEY` y `CURRENTS_API_KEY`: respaldo de noticias deportivas/sentimiento.
- `RAPIDAPI_KEY`: adaptadores deportivos vía RapidAPI.
- `THESPORTSDB_API_KEY`: datos públicos de TheSportsDB.
- `FOOTBALL_DATA_API_KEY`: fixtures/standings de Football-Data.org.

APIs opcionales no incluidas actualmente:

- `NEWS_API_KEY`: activa noticias deportivas y sentimiento.
- `API_SPORTS_KEY`: activa contexto de fixtures en proveedores API-Sports compatibles.
- `ODDS_API_KEY`: activa consenso de cuotas externas usando The Odds API.
- `POLYMARKET_DATA_URL`: leaderboard y holders públicos de Polymarket.

## Seguridad

Nunca subas `.env`, `config/.env` ni claves privadas. Si algún token se publicó antes, rótalo antes de usar el bot.

El modo `live` está bloqueado deliberadamente en esta versión. La ejecución real requiere integrar y auditar firma CLOB oficial, wallet, permisos, límites operativos y monitoreo antes de habilitar órdenes reales.

## Disclaimer

Este software es una herramienta de análisis y automatización. Los mercados de predicción tienen riesgo de pérdida total, baja liquidez, spreads amplios y cambios regulatorios. Opera bajo tu propia responsabilidad.

## Licencia
MIT License
