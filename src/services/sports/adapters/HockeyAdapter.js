const { RapidApiAdapter } = require('./RapidApiAdapter');

class HockeyAdapter extends RapidApiAdapter {
  constructor(client) {
    super(client, 'api-hockey.p.rapidapi.com', 'Hockey');
  }

  async fetchContext({ teams }) {
    if (!teams.home && !teams.away) {
      return { records: [], fixtures: [], notes: ['No teams specified'] };
    }

    // NHL league id is 57 in api-hockey
    const league = 57;
    const season = new Date().getFullYear();

    const standingsData = await this.fetchStandings({ league, season });
    const records = [];

    (standingsData[0] || []).forEach(teamGroup => {
      const teamData = teamGroup.team;
      const games = teamGroup.games;
      records.push({
        team: teamData.name,
        wins: games.win.total,
        losses: games.lose.total,
        pct: games.win.percentage,
        source: 'API-Hockey (RapidAPI)'
      });
    });

    const expectedTeams = [teams.home, teams.away].map(t => String(t || '').toLowerCase()).filter(Boolean);
    const relevantRecords = records.filter(r => 
      expectedTeams.length === 0 || expectedTeams.some(et => r.team.toLowerCase().includes(et))
    );

    return {
      records: relevantRecords,
      fixtures: [],
      notes: [`API-Hockey parsed successfully. Found ${relevantRecords.length} relevant records`]
    };
  }
}

module.exports = { HockeyAdapter };
