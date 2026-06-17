const axios = require('axios');
const config = require('../../core/Config');

class NewsApiClient {
  constructor() {
    this.enabled = Boolean(config.news.apiKey);
    this.client = axios.create({
      baseURL: config.news.baseUrl,
      timeout: config.polymarket.requestTimeoutMs,
      headers: config.news.apiKey ? { 'X-Api-Key': config.news.apiKey } : {},
    });
  }

  async search(query, options = {}) {
    if (!this.enabled || !query) return [];

    const from = new Date(Date.now() - config.news.lookbackHours * 60 * 60 * 1000).toISOString();
    const params = {
      q: query.slice(0, 500),
      searchIn: 'title,description',
      from,
      language: config.news.language,
      sortBy: 'publishedAt',
      pageSize: config.news.pageSize,
      page: 1,
    };

    const domains = options.domains?.length ? options.domains : config.news.domains;
    if (domains.length) params.domains = domains.join(',');

    const { data } = await this.client.get('/everything', { params });
    const articles = data.articles || [];
    if (articles.length || !domains.length || options.disableDomainFallback) return articles;

    const fallbackParams = { ...params };
    delete fallbackParams.domains;
    const fallback = await this.client.get('/everything', { params: fallbackParams });
    return fallback.data.articles || [];
  }
}

module.exports = { NewsApiClient };
