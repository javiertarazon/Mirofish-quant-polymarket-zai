const axios = require('axios');
const config = require('../../core/Config');
const logger = require('../../core/Logger');

class NewsApiClient {
  constructor() {
    this.newsApiEnabled = Boolean(config.news.apiKey);
    this.gnewsEnabled = Boolean(config.news.gnewsApiKey);
    this.currentsEnabled = Boolean(config.news.currentsApiKey);
    
    this.newsApiClient = axios.create({
      baseURL: config.news.baseUrl,
      timeout: config.polymarket.requestTimeoutMs,
      headers: config.news.apiKey ? { 'X-Api-Key': config.news.apiKey } : {},
    });
  }

  async search(query, options = {}) {
    if (!query) return [];

    // Load Balancer: Try GNews -> Currents -> NewsAPI
    if (this.gnewsEnabled) {
      try {
        const articles = await this.searchGNews(query);
        if (articles.length > 0) return articles;
      } catch (err) {
        logger.debug(`GNews failed: ${err.message}. Falling back...`);
      }
    }

    if (this.currentsEnabled) {
      try {
        const articles = await this.searchCurrents(query);
        if (articles.length > 0) return articles;
      } catch (err) {
        logger.debug(`Currents failed: ${err.message}. Falling back...`);
      }
    }

    if (this.newsApiEnabled) {
      try {
        const articles = await this.searchNewsApi(query, options);
        return articles;
      } catch (err) {
        logger.debug(`NewsAPI failed: ${err.message}.`);
      }
    }

    return [];
  }

  async searchGNews(query) {
    const url = `https://gnews.io/api/v4/search`;
    const { data } = await axios.get(url, {
      params: {
        q: query,
        lang: config.news.language,
        max: 10,
        apikey: config.news.gnewsApiKey,
      },
      timeout: config.polymarket.requestTimeoutMs,
    });
    return (data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      publishedAt: a.publishedAt,
      source: { name: a.source?.name || 'GNews' }
    }));
  }

  async searchCurrents(query) {
    const url = `https://api.currentsapi.services/v1/search`;
    const { data } = await axios.get(url, {
      params: {
        keywords: query,
        language: config.news.language,
        apiKey: config.news.currentsApiKey,
      },
      timeout: config.polymarket.requestTimeoutMs,
    });
    return (data.news || []).map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      publishedAt: a.published,
      source: { name: 'Currents' }
    }));
  }

  async searchNewsApi(query, options) {
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

    const { data } = await this.newsApiClient.get('/everything', { params });
    const articles = data.articles || [];
    if (articles.length || !domains.length || options.disableDomainFallback) return articles;

    const fallbackParams = { ...params };
    delete fallbackParams.domains;
    const fallback = await this.newsApiClient.get('/everything', { params: fallbackParams });
    return fallback.data.articles || [];
  }
}

module.exports = { NewsApiClient };
