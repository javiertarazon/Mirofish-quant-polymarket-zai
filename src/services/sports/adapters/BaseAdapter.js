class BaseAdapter {
  constructor(client) {
    this.client = client; // Reference to OfficialStatsClient or axios instances
  }

  /**
   * Fetches the context (records, fixtures, notes) for specific teams.
   * @param {Object} params 
   * @param {Object} params.teams { home, away }
   * @param {Date|string} params.date
   * @returns {Promise<{records: Array, fixtures: Array, notes: Array}>}
   */
  async fetchContext({ teams, date }) {
    throw new Error('fetchContext not implemented');
  }

  /**
   * Fetches source snapshots for the sport (top links, news, rankings overview).
   * @param {Object} params
   * @param {number} params.limit
   * @returns {Promise<Array>}
   */
  async fetchSourceSnapshots({ limit }) {
    throw new Error('fetchSourceSnapshots not implemented');
  }
}

module.exports = { BaseAdapter };
