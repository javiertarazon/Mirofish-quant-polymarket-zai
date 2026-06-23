const { RapidApiAdapter } = require('./RapidApiAdapter');

class NflAdapter extends RapidApiAdapter {
  constructor(client) {
    super(client, 'api-american-football.p.rapidapi.com', 'NFL');
  }

  async fetchContext({ teams }) {
    if (!teams.home && !teams.away) {
      return { records: [], fixtures: [], notes: ['No teams specified'] };
    }

    // NFL league id is 1 in api-american-football
    const league = 1;
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
        source: 'API-American-Football (RapidAPI)'
      });
    });

    const expectedTeams = [teams.home, teams.away].map(t => String(t || '').toLowerCase()).filter(Boolean);
    const relevantRecords = records.filter(r => 
      expectedTeams.length === 0 || expectedTeams.some(et => r.team.toLowerCase().includes(et))
    );

    return {
      records: relevantRecords,
      fixtures: [],
      notes: [`API-American-Football parsed successfully. Found ${relevantRecords.length} relevant records`]
    };
  }
}

module.exports = { NflAdapter };
