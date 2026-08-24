import { GoogleGenerativeAI } from '@google/generative-ai';
import { hybridSearch, buildRAGContext } from './search.js';
import { STREAM_SYSTEM } from './prompts.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export async function streamRAGResponse(query, res, options = {}) {
  const { sourceType, category, court, yearFrom, yearTo, history = [] } = options;

  try {
    const searchResults = await hybridSearch(query, { limit: 15, sourceType, category, court, yearFrom, yearTo });
    const ragContext = buildRAGContext(searchResults);

    const sources = searchResults.results.map(r => ({
      id: r.sourceId || r.id,
      title: r.title,
      citation: r.citation || `Article ${r.article || ''}`.trim(),
      court: r.court,
      year: r.year,
      category: r.category,
      score: Number((r.score || 0).toFixed(4)),
      sourceType: r.sourceType,
    }));

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: `${STREAM_SYSTEM}\n\nDATABASE RESULTS:\n${ragContext}`,
    });

    const conversation = history.length > 0
      ? history.map(h => `${h.role === 'ai' || h.role === 'assistant' ? 'assistant' : 'user'}: ${h.content}`).join('\n') + `\nuser: ${query}`
      : query;

    let fullText = '';
    try {
      const result = await model.generateContentStream(conversation);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
        }
      }
    } catch (streamErr) {
      // Fallback: non-streaming generation
      console.warn('Streaming failed, falling back:', streamErr.message);
      const result = await model.generateContent(conversation);
      fullText = result.response.text();
      for (const piece of fullText.match(/[\s\S]{1,120}/g) || [fullText]) {
        res.write(`data: ${JSON.stringify({ type: 'text', content: piece })}\n\n`);
      }
    }

    // Post-stream citation audit (non-blocking for the user experience)
    let validation = null;
    try {
      const { validateCitations } = await import('./agent.js');
      validation = await validateCitations(fullText);
    } catch {}
    if (validation && !validation.valid) {
      res.write(`data: ${JSON.stringify({
        type: 'validation',
        valid: false,
        invalidCitations: validation.invalid.map(i => ({ citation: i.citation, closestMatch: i.closestMatch })),
        message: 'Some citations could not be verified in the database.',
      })}\n\n`);
    } else if (validation) {
      res.write(`data: ${JSON.stringify({ type: 'validation', valid: true, verifiedCount: validation.verified.length })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Stream RAG error:', err.message);
    if (!res.headersSent) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}
