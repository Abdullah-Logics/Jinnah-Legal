import { GoogleGenerativeAI } from '@google/generative-ai';
import { hybridSearch, buildRAGContext } from './search.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const STREAM_SYSTEM = `You are Jinnah Legal AI — an advanced RAG-powered legal research assistant for Pakistani law.

You have access to a comprehensive database of 16,000+ Pakistani court cases and the complete Constitution of Pakistan 1973.

IMPORTANT: You will receive pre-retrieved legal context below. Use this context to answer the user's question with specific citations and references. Always cite your sources.

When citing cases, use proper Pakistani format: "Case Name, Citation (Court, Year)"
When citing the constitution, use: "Article X of the Constitution of Pakistan, 1973"

Respond in the same language the user uses. Be thorough but concise.`;

export async function streamRAGResponse(query, res, options = {}) {
  const { sourceType, category, court, yearFrom, yearTo, history = [] } = options;

  try {
    const searchResults = await hybridSearch(query, { limit: 15, sourceType, category, court, yearFrom, yearTo });
    const ragContext = buildRAGContext(searchResults);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: `${STREAM_SYSTEM}\n\nRETRIEVED LEGAL CONTEXT:\n${ragContext}`,
    });

    const sources = searchResults.results.map(r => ({
      title: r.title,
      citation: r.citation || `Article ${r.article || ''}`.trim(),
      court: r.court,
      year: r.year,
      category: r.category,
      score: r.score,
      sourceType: r.sourceType,
    }));

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Sources': JSON.stringify(sources.slice(0, 5)),
    });

    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    const prompt = history.length > 0
      ? history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nuser: ${query}`
      : query;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const chunks = text.match(/.{1,100}/g) || [text];
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Stream RAG error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}
