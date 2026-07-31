export interface CitationRef {
  citation: string;
  title: string;
  court: string;
  year: number;
}

export interface CitationReferences {
  citing: CitationRef[];
  citedBy: CitationRef[];
}

export interface FullCitation {
  id: string;
  title: string;
  citation: string;
  court: string;
  year: number;
  parties?: string;
  category?: string;
  description?: string;
  full_text?: string;
  relevant_statutes?: string | string[];
  keywords?: string;
  pdf_url?: string;
  references?: CitationReferences;
}

export function buildCitationHtml(full: FullCitation): string {
  const statutes = Array.isArray(full.relevant_statutes) ? full.relevant_statutes.join(', ') : full.relevant_statutes || '';
  const refs = full.references || { citing: [], citedBy: [] };
  const esc = (s?: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  let html = `<h3>Case Reference: ${esc(full.citation)}</h3>`;
  html += `<p><strong>${esc(full.title)}</strong></p>`;
  html += `<p><em>${esc(full.court)} (${full.year || ''})</em></p>`;
  if (full.parties) html += `<p><strong>Parties:</strong> ${esc(full.parties)}</p>`;
  if (full.category) html += `<p><strong>Category:</strong> ${esc(full.category)}</p>`;
  if (statutes) html += `<p><strong>Statutes:</strong> ${esc(statutes)}</p>`;
  if (full.pdf_url) html += `<p><strong>PDF:</strong> ${esc(full.pdf_url)}</p>`;
  if (full.description) html += `<p>${esc(full.description)}</p>`;
  if (full.full_text) html += `<h4>Judgment Text</h4><p>${esc(full.full_text)}</p>`;
  if (refs.citing.length > 0) {
    html += `<h4>Cases Cited</h4><ul>${refs.citing.slice(0, 20).map(r => `<li>${esc(r.citation)} — ${esc(r.title)} (${esc(r.court)}, ${r.year})</li>`).join('')}</ul>`;
  }
  if (refs.citedBy.length > 0) {
    html += `<h4>Cited By</h4><ul>${refs.citedBy.slice(0, 20).map(r => `<li>${esc(r.citation)} — ${esc(r.title)} (${esc(r.court)}, ${r.year})</li>`).join('')}</ul>`;
  }
  return html;
}
