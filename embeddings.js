const OpenAI = require('openai');
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function createEmbedding(text) {
  if (!client) return null;
  try {
    const resp = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
    return resp.data[0].embedding;
  } catch (err) {
    console.error('Embedding error', err?.message || err);
    return null;
  }
}

module.exports = { createEmbedding };
