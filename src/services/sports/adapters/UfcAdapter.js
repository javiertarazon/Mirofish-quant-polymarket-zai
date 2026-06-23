const { BaseAdapter } = require('./BaseAdapter');

class UfcAdapter extends BaseAdapter {
  constructor(client) {
    super(client);
  }

  async fetchContext({ teams }) {
    // We delegate the heavy lifting to TheSportsDB
    const dbAdapter = this.client.adapters['TheSportsDB'];
    if (dbAdapter) {
      return await dbAdapter.fetchContext({ sport: 'Fighting', teams });
    }
    return { records: [], fixtures: [], notes: ['UFC official stats using fallback mode'] };
  }
}

module.exports = { UfcAdapter };
