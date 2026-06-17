const test = require('node:test');
const assert = require('node:assert/strict');
const { NewsApiClient } = require('../src/services/news/NewsApiClient');

test('NewsApiClient retries without domains when domain-filtered search is empty', async () => {
  const client = new NewsApiClient();
  client.enabled = true;
  const calls = [];
  client.client = {
    get: async (path, { params }) => {
      calls.push({ path, params });
      if (params.domains) return { data: { articles: [] } };
      return { data: { articles: [{ title: 'fallback article' }] } };
    },
  };

  const articles = await client.search('sports', { domains: ['mlb.com'] });

  assert.equal(articles.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].params.domains, 'mlb.com');
  assert.equal(calls[1].params.domains, undefined);
});
