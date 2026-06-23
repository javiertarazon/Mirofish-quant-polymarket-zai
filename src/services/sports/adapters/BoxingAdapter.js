const { BaseAdapter } = require('./BaseAdapter');

class BoxingAdapter extends BaseAdapter {
  constructor(client) {
    super(client);
  }

  async fetchContext({ teams }) {
    // We delegate the heavy lifting to TheSportsDB
    const dbAdapter = this.client.adapters['TheSportsDB'];
    if (dbAdapter) {
      return await dbAdapter.fetchContext({ sport: 'Boxing', teams });
    }
    return { records: [], fixtures: [], notes: ['Boxing official stats using fallback mode'] };
  }
}

module.exports = { BoxingAdapter };
