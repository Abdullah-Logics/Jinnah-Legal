import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { indexSingleCase } from '../rag/indexer.js';
import { encryptSensitive } from '../security/encryption.js';

const CASES = JSON.parse(
  readFileSync(new URL('../legal-data/verified-landmark-cases.json', import.meta.url), 'utf8')
);

export async function seedVerifiedCases(adapter) {
  const result = { inserted: 0, skipped: 0, indexed: 0 };
  const canEmbed = Boolean(process.env.GEMINI_API_KEY);

  for (const item of CASES) {
    const url = new URL(item.sourceUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'www.supremecourt.gov.pk') {
      throw new Error(`Untrusted source URL for ${item.title}`);
    }

    const contentHash = createHash('sha256')
      .update(`${item.sourceUrl}\n${item.fullText}`)
      .digest('hex');

    const existing = await adapter.query('SELECT id FROM legal_sources WHERE content_hash=?', [contentHash]);
    if (existing.length) {
      result.skipped += 1;
      const chunks = await adapter.query('SELECT COUNT(*) c FROM rag_chunks WHERE source_id=?', [existing[0].id]);
      if (canEmbed && Number(chunks[0]?.c || 0) === 0) {
        try {
          const indexed = await indexSingleCase(existing[0].id, adapter.query.bind(adapter));
          result.indexed += indexed?.indexed || 0;
        } catch (err) {
          console.warn(`Verified case indexing failed for ${item.title}:`, err.message);
        }
      }
      continue;
    }

    const id = uuid();
    const verifiedAt = new Date().toISOString();

    await adapter.run(
      `INSERT INTO legal_sources
        (id,title,citation,court,year,parties,category,description,full_text,source_url,source_type,content_hash,status,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, item.title, item.citation, item.court, item.year, item.parties, item.category,
        item.description, item.fullText, item.sourceUrl, item.sourceType, contentHash,
        'approved', 'system-seed']
    );

    await adapter.run(
      `INSERT INTO citations
        (id,title,citation,court,year,parties,category,description,full_text,keywords,source_url,source_type,verification_status,verified_at,verified_by,content_hash)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, item.title, item.citation, item.court, item.year, item.parties, item.category,
        item.description, item.fullText, item.description, item.sourceUrl, item.sourceType,
        'verified_admin', verifiedAt, 'system-seed', contentHash]
    );

    await adapter.run(
      'INSERT INTO admin_audit_log (id,admin_id,action,details_encrypted) VALUES (?,?,?,?)',
      [uuid(), 'system-seed', 'legal_source_ingest',
        encryptSensitive(JSON.stringify({ id, title: item.title, citation: item.citation, sourceUrl: item.sourceUrl }))]
    );

    if (canEmbed) {
      try {
        const indexed = await indexSingleCase(id, adapter.query.bind(adapter));
        result.indexed += indexed?.indexed || 0;
      } catch (err) {
        console.warn(`Verified case indexing failed for ${item.title}:`, err.message);
      }
    }

    result.inserted += 1;
  }

  return result;
}
