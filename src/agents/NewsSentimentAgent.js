const { NewsApiClient } = require('../services/news/NewsApiClient');
const { getNewsDomainsForSport, getSourceProfile, normalizeSport } = require('../services/sports/SportsSourceRegistry');
const { averageSentiment } = require('../utils/sentiment');
const { extractTeams, inferSportFromTitle } = require('../utils/teams');
const { agentResult, disabledAgent } = require('./AgentResult');

class NewsSentimentAgent {
  constructor() {
    this.name = 'news_sentiment';
    this.news = new NewsApiClient();
  }

  async analyze({ market }) {
    if (!this.news.enabled) return disabledAgent(this.name, 'NEWS_API_KEY missing');

    const teams = extractTeams(market.title);
    const sport = normalizeSport(market.sport && market.sport !== 'general' ? market.sport : inferSportFromTitle(market.title));
    const profile = getSourceProfile(sport);
    const domains = getNewsDomainsForSport(sport, {
      includeOfficial: true,
      includeExternal: true,
    });
    const query = [teams.home, teams.away].filter(Boolean).join(' OR ') || market.title;
    const articles = await this.news.search(query, { domains });
    const sentiment = averageSentiment(articles, article => `${article.title || ''} ${article.description || ''}`);
    const confidence = Math.min(1, articles.length / 12);

    return agentResult({
      name: this.name,
      score: sentiment,
      confidence,
      probabilityShift: sentiment * confidence * 0.035,
      notes: [`${articles.length} recent articles`, `sentiment ${sentiment.toFixed(3)}`, `sport ${sport}`],
      data: {
        query,
        sport,
        domains,
        officialNewsSources: profile.officialNews,
        externalNewsDomains: profile.externalNewsDomains,
        articles: articles.slice(0, 5).map(article => ({
          title: article.title,
          source: article.source?.name,
          url: article.url,
          publishedAt: article.publishedAt,
        })),
      },
    });
  }
}

module.exports = { NewsSentimentAgent };
