const state = {
  summary: null,
  trades: [],
  predictions: [],
  markets: [],
  sources: null,
  config: null,
  cycle: null,
  sport: 'all',
  view: 'overview',
  cyclePoll: null,
};

const titles = {
  overview: ['Resumen', 'Estado operativo, probabilidades, señales y riesgo.'],
  signals: ['Señales', 'Probabilidades, edge, Kelly, agentes y fuentes por mercado.'],
  trades: ['Apuestas', 'Historial shadow/live con stake, odds y resultados.'],
  markets: ['Mercados', 'Mercados persistidos, liquidez, volumen y vencimiento.'],
  sources: ['Fuentes', 'Estadísticas oficiales, noticias y proveedores externos por deporte.'],
  settings: ['Riesgo', 'Parámetros activos del modelo y gestión de bankroll.'],
};

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const pct = (value) => value === null || value === undefined ? '-' : `${(Number(value) * 100).toFixed(1)}%`;
const num = (value, digits = 2) => value === null || value === undefined ? '-' : Number(value).toFixed(digits);
const usd = (value) => `$${fmt.format(Number(value || 0))}`;

async function loadDashboard() {
  setStatus('Cargando', 'Actualizando datos', false);
  const [summary, trades, predictions, markets, sources, config, cycle] = await Promise.all([
    fetchJson('/api/summary'),
    fetchJson('/api/trades?limit=250'),
    fetchJson('/api/predictions?limit=250'),
    fetchJson('/api/markets?limit=250'),
    fetchJson('/api/sources'),
    fetchJson('/api/config'),
    fetchJson('/api/cycle/status'),
  ]);

  Object.assign(state, { summary, trades, predictions, markets, sources, config, cycle });
  populateSportFilter();
  render();
  renderCycleStatus();
  setStatus('Operativo', `Actualizado ${new Date(summary.generatedAt).toLocaleTimeString()}`, true);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

function render() {
  renderHeader();
  renderOverview();
  renderSignals();
  renderTrades();
  renderMarkets();
  renderSources();
  renderSettings();
}

function renderHeader() {
  const [title, subtitle] = titles[state.view];
  text('viewTitle', title);
  text('viewSubtitle', subtitle);
  renderCycleStatus();
}

function renderOverview() {
  const summary = state.summary;
  if (!summary) return;
  text('metricPredictions', summary.counts.predictions);
  text('metricTrades', summary.counts.shadowTrades);
  text('metricOpen', `${summary.counts.openTrades}/${summary.config.risk.maxOpenTrades}`);
  text('metricConfidence', summary.averages.confidence === null ? '-' : `${summary.averages.confidence.toFixed(1)}%`);
  text('metricEv', num(summary.averages.expectedValue, 3));
  text('metricKelly', usd(summary.averages.kellySize));
  text('metricSportsMarkets', summary.counts.sportsMarkets);
  text('metricGeneralMarkets', summary.counts.generalMarkets);
  renderSportChart();
  renderEvChart();
}

function renderSportChart() {
  const rows = state.summary.sportBreakdown.filter(matchesSport);
  const max = Math.max(...rows.map((item) => item.count), 1);
  html('sportChart', rows.length ? rows.map((item) => `
    <div class="bar-row">
      <strong>${escapeHtml(item.sport)}</strong>
      <div class="bar-track"><div class="bar-fill" style="width:${(item.count / max) * 100}%"></div></div>
      <span class="bar-value">${item.count} / ${item.avgConfidence}%</span>
    </div>
  `).join('') : empty('Sin señales para este filtro'));
}

function renderEvChart() {
  const rows = state.summary.evBuckets;
  const max = Math.max(...rows.map((item) => item.count), 1);
  html('evChart', rows.map((item) => `
    <div class="bar-row">
      <strong>${escapeHtml(item.label)}</strong>
      <div class="bar-track"><div class="bar-fill" style="width:${(item.count / max) * 100}%"></div></div>
      <span class="bar-value">${item.count}</span>
    </div>
  `).join(''));
}

function renderSignals() {
  const query = document.getElementById('signalSearch').value.toLowerCase();
  const rows = state.predictions
    .filter(matchesSport)
    .filter((item) => searchable(item, query, ['title', 'sport', 'predictedOutcome', 'summary']))
    .sort(sportsFirst);

  text('signalsCount', `${rows.length} señales`);
  html('signalsList', rows.length ? rows.map(signalCard).join('') : empty('No hay señales con este filtro'));
}

function signalCard(item) {
  const agents = (item.agents || []).map((agent) => `
    <span class="pill ${agent.enabled ? 'active' : ''}">${escapeHtml(agent.name)} ${num(agent.score, 2)}</span>
  `).join('');

  return `
    <article class="signal-card">
      <div class="signal-top">
        <div>
          <div class="signal-title">${escapeHtml(item.title)}</div>
          <div class="signal-meta">
            <span class="pill active">${escapeHtml(item.sport)}</span>
            <span class="pill">${escapeHtml(item.predictedOutcome)}</span>
            <span class="pill ${item.status === 'ACTIVE' ? 'active' : ''}">${escapeHtml(item.status)}</span>
            <span class="pill">${new Date(item.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <span class="pill buy">${escapeHtml(item.thesis || 'SIGNAL')}</span>
      </div>
      <div class="prob-grid">
        <div class="prob-item"><span>Modelo</span><strong>${pct(item.modelProbability)}</strong></div>
        <div class="prob-item"><span>Implícita</span><strong>${pct(item.impliedProbability)}</strong></div>
        <div class="prob-item"><span>Gap</span><strong>${pct(item.undervaluationGap)}</strong></div>
        <div class="prob-item"><span>EV</span><strong>${num(item.expectedValue, 4)}</strong></div>
        <div class="prob-item"><span>Kelly</span><strong>${usd(item.kellySize)}</strong></div>
      </div>
      <p>${escapeHtml(item.summary || '')}</p>
      <div class="agent-strip">${agents}</div>
    </article>
  `;
}

function renderTrades() {
  const query = document.getElementById('tradeSearch').value.toLowerCase();
  const rows = state.trades
    .filter(matchesSport)
    .filter((item) => searchable(item, query, ['title', 'sport', 'side', 'status']))
    .sort(sportsFirst);

  text('tradesCount', `${rows.length} apuestas`);
  html('tradesTable', rows.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.marketId)}</small></td>
      <td>${escapeHtml(item.sport)}</td>
      <td><span class="pill buy">${escapeHtml(item.side)}</span></td>
      <td>${usd(item.stake)}</td>
      <td>${num(item.odds, 4)}</td>
      <td>${pct(item.probability)}</td>
      <td>${num(item.expectedValue, 4)}</td>
      <td><span class="pill ${item.status === 'OPEN' ? 'active' : 'closed'}">${escapeHtml(item.status)}</span></td>
      <td>${new Date(item.executedAt).toLocaleString()}</td>
    </tr>
  `).join('') || `<tr><td colspan="9">${empty('No hay apuestas con este filtro')}</td></tr>`);
}

function renderMarkets() {
  const rows = state.markets.filter(matchesSport).sort(sportsFirst);
  html('marketsGrid', rows.length ? rows.map((item) => `
    <article class="market-card">
      <h3>${escapeHtml(item.title)}</h3>
      <div class="signal-meta">
        <span class="pill active">${escapeHtml(item.sport)}</span>
        <span class="pill">${escapeHtml(item.category)}</span>
        <span class="pill ${item.isActive ? 'active' : 'closed'}">${item.isActive ? 'Activo' : 'Inactivo'}</span>
      </div>
      <div class="stats">
        <div class="stat"><span>Outcome</span><strong>${escapeHtml(item.outcome)}</strong></div>
        <div class="stat"><span>Odds</span><strong>${num(item.odds, 4)}</strong></div>
        <div class="stat"><span>Volumen</span><strong>${usd(item.volume)}</strong></div>
        <div class="stat"><span>Liquidez</span><strong>${usd(item.liquidity)}</strong></div>
        <div class="stat"><span>Señales</span><strong>${item.predictionCount}</strong></div>
        <div class="stat"><span>Apuestas</span><strong>${item.tradeCount}</strong></div>
      </div>
    </article>
  `).join('') : empty('No hay mercados con este filtro'));
}

function renderSources() {
  const sports = state.sources?.sports || {};
  const entries = Object.entries(sports).filter(([sport]) => state.sport === 'all' || sport === state.sport);

  html('sourcesGrid', entries.map(([sport, profile]) => `
    <article class="source-card">
      <h3>${escapeHtml(sport)}</h3>
      <div class="stats">
        <div class="stat"><span>Stats oficiales</span><strong>${profile.officialStats.length}</strong></div>
        <div class="stat"><span>Noticias oficiales</span><strong>${profile.officialNews.length}</strong></div>
        <div class="stat"><span>Scrapeables</span><strong>${scrapeableCount(profile)}</strong></div>
        <div class="stat"><span>Modo</span><strong>Web</strong></div>
      </div>
      <div class="source-links">
        ${profile.officialStats.map(link).join('')}
        ${profile.officialNews.map(link).join('')}
      </div>
      <p>Externas: ${escapeHtml(profile.externalNewsDomains.join(', ') || 'ninguna')}</p>
    </article>
  `).join(''));
}

function renderSettings() {
  renderKv('riskSettings', state.config?.risk || {});
  renderKv('strategySettings', state.config?.strategy || {});
  renderKv('swarmSettings', state.config?.swarm || {});
}

function scrapeableCount(profile) {
  return [...(profile.officialStats || []), ...(profile.officialNews || [])].filter(source => source.scrapeable).length;
}

function renderCycleStatus() {
  const button = document.getElementById('runCycleBtn');
  const cycle = state.cycle;
  if (!cycle) {
    text('cycleStatus', 'Ciclo inactivo');
    button.disabled = false;
    return;
  }

  button.disabled = Boolean(cycle.running);
  if (cycle.running) {
    text('cycleStatus', `Ejecutando desde ${new Date(cycle.lastStartedAt).toLocaleTimeString()}`);
    return;
  }

  if (cycle.lastError) {
    text('cycleStatus', `Error: ${cycle.lastError.message}`);
    return;
  }

  const stats = cycle.lastResult?.stats;
  if (stats) {
    text('cycleStatus', `Último ciclo: ${stats.signals} señales, ${stats.executed} shadow`);
    return;
  }

  text('cycleStatus', 'Ciclo inactivo');
}

async function runCycle() {
  const button = document.getElementById('runCycleBtn');
  button.disabled = true;
  text('cycleStatus', 'Iniciando ciclo');

  const response = await fetch('/api/cycle', { method: 'POST' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `POST /api/cycle ${response.status}`);

  state.cycle = body.state;
  renderCycleStatus();
  pollCycleUntilIdle();
}

function pollCycleUntilIdle() {
  if (state.cyclePoll) clearInterval(state.cyclePoll);
  state.cyclePoll = setInterval(async () => {
    try {
      state.cycle = await fetchJson('/api/cycle/status');
      renderCycleStatus();
      if (!state.cycle.running) {
        clearInterval(state.cyclePoll);
        state.cyclePoll = null;
        await loadDashboard();
      }
    } catch (error) {
      clearInterval(state.cyclePoll);
      state.cyclePoll = null;
      text('cycleStatus', error.message);
      document.getElementById('runCycleBtn').disabled = false;
    }
  }, 2500);
}

function renderKv(id, object) {
  html(id, Object.entries(object).map(([key, value]) => `
    <div class="kv-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(String(value))}</strong></div>
  `).join(''));
}

function populateSportFilter() {
  const filter = document.getElementById('sportFilter');
  const current = filter.value || 'all';
  const sports = new Set(['all']);
  for (const item of state.predictions) sports.add(item.sport || 'general');
  for (const item of state.markets) sports.add(item.sport || 'general');
  for (const sport of Object.keys(state.sources?.sports || {})) sports.add(sport);

  filter.innerHTML = [...sports].map((sport) => `
    <option value="${escapeHtml(sport)}">${sport === 'all' ? 'Todos los deportes' : escapeHtml(sport)}</option>
  `).join('');
  filter.value = [...sports].includes(current) ? current : 'all';
  state.sport = filter.value;
}

function matchesSport(item) {
  return state.sport === 'all' || item.sport === state.sport;
}

function searchable(item, query, keys) {
  if (!query) return true;
  return keys.some((key) => String(item[key] || '').toLowerCase().includes(query));
}

function sportsFirst(a, b) {
  const aSport = a.sport && a.sport !== 'general' ? 1 : 0;
  const bSport = b.sport && b.sport !== 'general' ? 1 : 0;
  if (aSport !== bSport) return bSport - aSport;
  return String(a.title || '').localeCompare(String(b.title || ''));
}

function setStatus(title, subtitle, ok) {
  text('statusText', title);
  text('statusMeta', subtitle);
  const dot = document.getElementById('statusDot');
  dot.className = `status-dot ${ok ? 'ok' : ''}`;
}

function link(source) {
  const badge = source.scrapeable ? '<span class="mini-badge">scrape</span>' : '';
  return `<a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.name)} ${badge}</a>`;
}

function empty(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function text(id, value) {
  document.getElementById(id).textContent = value;
}

function html(id, value) {
  document.getElementById(id).innerHTML = value;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === state.view));
    renderHeader();
  });
});

document.getElementById('sportFilter').addEventListener('change', (event) => {
  state.sport = event.target.value;
  render();
});
document.getElementById('refreshBtn').addEventListener('click', () => {
  loadDashboard().catch((error) => {
    setStatus('Error', error.message, false);
    document.getElementById('statusDot').classList.add('error');
  });
});
document.getElementById('runCycleBtn').addEventListener('click', () => {
  runCycle().catch((error) => {
    text('cycleStatus', error.message);
    document.getElementById('runCycleBtn').disabled = false;
  });
});
document.getElementById('signalSearch').addEventListener('input', renderSignals);
document.getElementById('tradeSearch').addEventListener('input', renderTrades);

loadDashboard().catch((error) => {
  setStatus('Error', error.message, false);
  document.getElementById('statusDot').classList.add('error');
});
