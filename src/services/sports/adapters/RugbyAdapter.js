const { BaseAdapter } = require('./BaseAdapter');
const axios = require('axios');
const config = require('../../../core/Config');

class RugbyAdapter extends BaseAdapter {
  constructor(client) {
    super(client);
    this.api = axios.create({
      baseURL: 'https://www.world.rugby/tournaments/rankings/mru',
      timeout: config.polymarket?.requestTimeoutMs || 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
  }

  async fetchContext({ teams, date }) {
    try {
      const { data } = await this.api.get('');
      const expected = [teams?.home, teams?.away].map(t => String(t || '').toLowerCase()).filter(Boolean);
      const records = [];
      const rowPattern = /<span class="team-name">([^<]+)<\/span>[\s\S]*?<td class="pts">([\d\.]+)<\/td>/gi;
      let match;
      while ((match = rowPattern.exec(data)) !== null) {
        const teamName = match[1].trim();
        const points = parseFloat(match[2]);
        if (expected.length === 0 || expected.some(et => teamName.toLowerCase().includes(et))) {
          records.push({ team: teamName, points, source: 'World Rugby Rankings' });
        }
      }
      return { records, fixtures: [], notes: ['Rugby Rankings parsed successfully'] };
    } catch (err) {
      return { records: [], fixtures: [], notes: [`Rugby fetch error: ${err.message}`] };
    }
  }

  async fetchSourceSnapshots({ limit }) { return []; }
}
module.exports = { RugbyAdapter };
