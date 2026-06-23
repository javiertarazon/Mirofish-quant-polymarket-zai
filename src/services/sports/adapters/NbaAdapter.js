const { RapidApiAdapter } = require('./RapidApiAdapter');

class NbaAdapter extends RapidApiAdapter {
  constructor(client) {
    super(client, 'api-basketball.p.rapidapi.com', 'NBA');
  }

  async fetchContext({ teams }) {
    if (!teams.home && !teams.away) {
      return { records: [], fixtures: [], notes: ['No teams specified'] };
    }

    // NBA league id is usually 12 in api-basketball, season 2023-2024
    const league = 12;
    const season = new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0);
    const seasonStr = `${season}-${season + 1}`;

    const standingsData = await this.fetchStandings({ league, season: seasonStr });
    const records = [];

    // Parse standings from api-basketball format
    (standingsData[0] || []).forEach(teamGroup => {
      const teamData = teamGroup.team;
      const games = teamGroup.games;
      records.push({
        team: teamData.name,
        wins: games.win.total,
        losses: games.lose.total,
        pct: games.win.percentage,
        source: 'API-Basketball (RapidAPI)'
      });
    });

    const expectedTeams = [teams.home, teams.away].map(t => String(t || '').toLowerCase()).filter(Boolean);
    const relevantRecords = records.filter(r => 
      expectedTeams.length === 0 || expectedTeams.some(et => r.team.toLowerCase().includes(et))
    );

    return {
      records: relevantRecords,
      fixtures: [], // Could fetch specific games here if needed
      notes: [`API-Basketball parsed successfully. Found ${relevantRecords.length} relevant records`]
    };
  }
}

module.exports = { NbaAdapter };
