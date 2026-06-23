const { BaseAdapter } = require('./BaseAdapter');
const axios = require('axios');
const config = require('../../../core/Config');

class IndyCarAdapter extends BaseAdapter {
  constructor(client) {
    super(client);
    this.api = axios.create({
      baseURL: 'https://www.indycar.com/Drivers',
      timeout: config.polymarket?.requestTimeoutMs || 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
  }

  async fetchContext({ teams, date }) {
    try {
      const { data } = await this.api.get('');
      const expected = [teams?.home, teams?.away].map(t => String(t || '').toLowerCase()).filter(Boolean);
      const records = [];
      const rowPattern = /<span class="driver-name">([^<]+)<\/span>[\s\S]*?<span class="driver-points">([\d]+)<\/span>/gi;
      let match;
      while ((match = rowPattern.exec(data)) !== null) {
        const driver = match[1].trim();
        const points = parseInt(match[2], 10);
        if (expected.length === 0 || expected.some(et => driver.toLowerCase().includes(et))) {
          records.push({ team: driver, points, source: 'IndyCar Official Standings' });
        }
      }
      return { records, fixtures: [], notes: ['IndyCar Standings parsed successfully'] };
    } catch (err) {
      return { records: [], fixtures: [], notes: [`IndyCar fetch error: ${err.message}`] };
    }
  }

  async fetchSourceSnapshots({ limit }) { return []; }
}
module.exports = { IndyCarAdapter };
