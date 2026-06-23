const { BaseAdapter } = require('./BaseAdapter');
const axios = require('axios');
const config = require('../../../core/Config');

class SoccerAdapter extends BaseAdapter {
  constructor(client) {
    super(client);
    this.api = axios.create({
      baseURL: 'https://en.wikipedia.org/wiki/FIFA_Men%27s_World_Ranking',
      timeout: config.polymarket?.requestTimeoutMs || 5000,
      headers: {
        'User-Agent': 'MiroFishQuant/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
  }

  async fetchContext({ teams, date }) {
    try {
      const { data } = await this.api.get('');
      const expectedTeams = [teams?.home, teams?.away].map(t => String(t || '').toLowerCase()).filter(Boolean);
      
      const records = [];
      
      const tableMatch = data.match(/Top 20 rankings as of[\s\S]*?<\/table>/i);
      if (!tableMatch) throw new Error("Could not find the ranking table on Wikipedia");

      const rowPattern = /<a[^>]*title="([^"]+?)(?:\snational football team)?"[^>]*>[^<]*<\/a><\/span><\/td>\s*<td[^>]*>[A-Z]*<\/td>\s*<td[^>]*>([\d,\.]+)[\s\S]*?<\/td>/gi;
      
      let match;
      let rankCounter = 1;
      while ((match = rowPattern.exec(tableMatch[0])) !== null) {
        const rank = rankCounter++;
        let teamName = match[1].trim();
        // remove " national football team" if still present
        teamName = teamName.replace(/ national football team/gi, '').trim();
        const points = parseFloat(match[2].replace(/,/g, ''));

        if (expectedTeams.length === 0 || expectedTeams.some(et => teamName.toLowerCase().includes(et))) {
          records.push({
            team: teamName,
            rank,
            points,
            source: 'Wikipedia (FIFA World Ranking)'
          });
        }
      }

      return {
        records,
        fixtures: [],
        notes: [`Soccer official standings parsed successfully`]
      };

    } catch (err) {
      console.error('Soccer Adapter Error:', err.message);
      return { records: [], fixtures: [], notes: [`Failed to fetch Soccer stats: ${err.message}`] };
    }
  }

  async fetchSourceSnapshots({ limit }) {
    return [];
  }
}

module.exports = { SoccerAdapter };
