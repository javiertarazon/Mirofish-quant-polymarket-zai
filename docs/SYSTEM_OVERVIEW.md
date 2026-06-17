# Explicacion del sistema

MiroFish Quant V5 es un bot cuantitativo para mercados de prediccion de Polymarket. Su objetivo es encontrar mercados deportivos con posible desalineacion entre el precio negociable y una probabilidad estimada por modelo, agentes y datos publicos.

## Flujo principal

1. `src/index.js` inicia base de datos, Telegram y motor de prediccion.
2. `PredictionEngine.scanMarketUniverse()` consulta primero eventos deportivos en Polymarket Gamma API usando `tag_slug=sports`, clasifica por deporte y devuelve el universo filtrado.
3. `PolymarketClient.parseMarketsFromEvents()` normaliza eventos y mercados.
4. El sistema persiste todos los mercados filtrados de Polymarket en `Market`, aunque no generen señal.
5. `PredictionEngine.selectMarketsForCycle()` selecciona un lote balanceado por `SPORTS_TARGETS` para el enjambre.
6. Para cada mercado candidato se lee el orderbook publico CLOB.
6. `PredictionEngine.analyzeOrderBook()` calcula best bid, best ask, precio de entrada, spread y profundidad.
7. `PredictionEngine.estimateProbability()` genera una probabilidad base usando microestructura, liquidez y volumen.
8. `SwarmOrchestrator` ejecuta agentes especializados y combina sus votos.
9. El motor calcula edge, gap de infravaloracion, expected value, confianza y stake Kelly.
10. El motor asigna un grado de señal (`A+`, `A`, `B`, `C`) usando probabilidad, confianza, acuerdo del enjambre y valor esperado.
11. `RiskManager` valida limites de riesgo y trades abiertos para decidir si la señal puede ejecutarse.
12. `DatabaseManager` guarda mercado y prediccion aunque la ejecucion quede bloqueada por riesgo.
13. Al guardar una nueva señal de un mercado, las señales activas anteriores del mismo mercado quedan como `SUPERSEDED` para evitar duplicados activos.
14. Si la ejecucion esta permitida y `AUTO_EXECUTE_SIGNALS=true`, se registra el trade shadow. Si no, queda pendiente para seguimiento o ejecucion manual en el dashboard.
14. `TelegramService` envia alertas y resumen de ciclo si esta configurado.

## Componentes principales

### Core

- `src/core/Config.js`: carga variables de entorno desde `.env` y `config/.env`, valida tipos y rangos.
- `src/core/DatabaseManager.js`: encapsula Prisma y persistencia de mercados, predicciones, trades y alertas.
- `src/core/Logger.js`: logger comun del sistema.

### Servicios

- `src/services/PolymarketClient.js`: consulta Gamma API, CLOB API, leaderboard, holders y trades publicos.
- `src/services/TelegramService.js`: envia mensajes cuando Telegram esta habilitado.
- `src/services/news/NewsApiClient.js`: consulta NewsAPI.
- `src/services/odds/OddsApiClient.js`: consulta The Odds API.
- `src/services/sports/*`: registra fuentes oficiales, noticias y proveedores por deporte.
- Las fuentes oficiales sin API dedicada se tratan como paginas scrapeables: el cliente descarga HTML, extrae titulo, descripcion y enlaces. `/api/sources` expone el estado de extraccion, paginas correctas y enlaces detectados.

### Motor

- `src/engine/PredictionEngine.js`: orquesta analisis de mercado, agentes, EV y generacion de senales.
- `src/engine/RiskManager.js`: calcula stake por Kelly fraccionado y aplica limites.
- `src/engine/TradeExecutor.js`: registra trades `shadow`; la ejecucion live esta bloqueada deliberadamente.

### Agentes

- `NewsSentimentAgent`: analiza sentimiento y relevancia de noticias.
- `SportsContextAgent`: incorpora contexto deportivo y fixtures cuando hay API disponible.
- `OfficialSourcesAgent`: verifica cobertura y relevancia en fuentes oficiales scrapeables cuando no hay API dedicada.
- `TopTraderAgent`: revisa leaderboard y actividad de traders publicos de Polymarket.
- `HolderConcentrationAgent`: mide concentracion de holders.
- `MarketMoodAgent`: estima sesgo de profundidad, spread y liquidez del orderbook.
- `ExternalOddsAgent`: compara probabilidad implícita contra cuotas externas.
- `SwarmOrchestrator`: pondera agentes y limita el desplazamiento maximo de probabilidad.

## Persistencia

La base SQLite se define en `prisma/schema.prisma` y contiene:

- `User`: usuario interno del bot.
- `Market`: mercados normalizados de Polymarket.
- `Prediction`: senales generadas, reasoning y fuentes.
- `Trade`: ejecuciones shadow o futuras ejecuciones reales.
- `TopTrader`: traders publicos rastreados.
- `NewsArticle`: noticias analizadas.
- `Alert`: alertas enviadas.
- `CopyTradeLog`: historial de copy-trading.

## Dashboard

`src/ui/dashboardServer.js` sirve `public/` y endpoints JSON. La interfaz permite:

- Ver resumen de predicciones, trades, abiertas, confianza, EV y Kelly.
- Filtrar por deporte.
- Revisar senales con agentes y reasoning.
- Ver titulos y estados traducidos al español mediante campos de presentacion como `titleLabel`, `sportLabel` y `statusLabel`.
- Mostrar una sola señal vigente por mercado, incluso si el historico contiene predicciones anteriores.
- Revisar apuestas shadow/live.
- Explorar mercados persistidos.
- Ver fuentes deportivas registradas.
- Ver fuentes oficiales extraidas realmente, con conteo de paginas correctas y enlaces encontrados.
- Ver configuracion publica sin secretos.
- Lanzar un ciclo manual `shadow` con `POST /api/cycle`.
- Entender señales por grado, probabilidad, EV, Kelly y acuerdo del enjambre.
- Ejecutar manualmente señales pendientes con control de riesgo mediante `POST /api/predictions/:id/execute`.

El ciclo manual queda protegido por tres reglas:

- Solo funciona con `TRADING_MODE=shadow`.
- No permite ciclos simultaneos.
- Devuelve estado consultable por `/api/cycle/status`.

## Modos de operacion

### Shadow

Modo por defecto. Genera predicciones, registra trades simulados y permite iterar la estrategia sin ejecutar ordenes reales.

### Live

El modo live esta bloqueado intencionalmente. Aunque exista configuracion para wallet y chain, `TradeExecutor` rechaza la ejecucion real hasta que se integre el SDK/firma CLOB oficial y se complete auditoria.

## Validacion

La suite `node --test` cubre:

- Servidor del dashboard y configuracion publica.
- Motor de prediccion.
- Riesgo y Kelly.
- Orquestador de agentes.
- Agente de top traders.
- Agente de odds externas.
- Cliente de noticias.
- Registro de fuentes deportivas.
