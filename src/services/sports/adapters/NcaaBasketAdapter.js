const { BaseAdapter } = require('./BaseAdapter');
const axios = require('axios');
const config = require('../../../core/Config');

class NcaaBasketAdapter extends BaseAdapter {
  constructor(client) {
    super(client);
    this.api = axios.create({
      baseURL: 'https://www.ncaa.com/rankings/basketball-men/d1/ap-top-25',
      timeout: config.polymarket?.requestTimeoutMs || 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
  }

  async fetchContext({ teams, date }) {
    try {
      const { data } = await this.api.get('');
      const expected = [teams?.home, teams?.away].map(t => String(t || '').toLowerCase()).filter(Boolean);
      const records = [];
      const rowPattern = /<tr>\s*<td>(\d+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([\d,-]+)<\/td>/gi;
      let match;
      while ((match = rowPattern.exec(data)) !== null) {
        const teamName = match[2].trim();
        if (expected.length === 0 || expected.some(et => teamName.toLowerCase().includes(et))) {
          records.push({ team: teamName, rank: parseInt(match[1]), record: match[4].trim(), source: 'NCAA Official Standings' });
        }
      }
      return { records, fixtures: [], notes: ['NCAA Standings parsed successfully'] };
    } catch (err) {
      return { records: [], fixtures: [], notes: [`NCAA fetch error: ${err.message}`] };
    }
  }

  async fetchSourceSnapshots({ limit }) { return []; }
}
module.exports = { NcaaBasketAdapter };
