const { BaseAdapter } = require('./BaseAdapter');
const axios = require('axios');
const config = require('../../../core/Config');

class MotoGpAdapter extends BaseAdapter {
  constructor(client) {
    super(client);
    this.api = axios.create({
      baseURL: 'https://www.motogp.com/en/results/standings',
      timeout: config.polymarket?.requestTimeoutMs || 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
  }

  async fetchContext({ teams, date }) {
    try {
      const { data } = await this.api.get('');
      const expected = [teams?.home, teams?.away].map(t => String(t || '').toLowerCase()).filter(Boolean);
      const records = [];
      const rowPattern = /<div class="rider-name">([^<]+)<\/div>[\s\S]*?<div class="rider-points">([\d\.]+)<\/div>/gi;
      let match;
      while ((match = rowPattern.exec(data)) !== null) {
        const rider = match[1].trim();
        const points = parseFloat(match[2]);
        if (expected.length === 0 || expected.some(et => rider.toLowerCase().includes(et))) {
          records.push({ team: rider, points, source: 'MotoGP Official Standings' });
        }
      }
      return { records, fixtures: [], notes: ['MotoGP Standings parsed successfully'] };
    } catch (err) {
      return { records: [], fixtures: [], notes: [`MotoGP fetch error: ${err.message}`] };
    }
  }

  async fetchSourceSnapshots({ limit }) { return []; }
}
module.exports = { MotoGpAdapter };
