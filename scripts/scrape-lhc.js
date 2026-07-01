import fs from 'fs';

const BASE = 'https://data.lhc.gov.pk';
const OUTPUT = 'lhc-judgments.json';

function parseLHCResponse(html) {
  const results = [];

  // Extract total count
  const totalMatch = html.match(/Total Judgments\s*<b>\s*(\d+)\s*<\/b>/i);
  console.log(`  Total reported: ${totalMatch ? totalMatch[1] : 'unknown'}`);

  // Split into individual case tables by </table> marker
  // Each case is in a pattern: <table ...> <tr bgcolor><td...>DATA</td>...</tr> <tr><td>Tagline</td></tr> </table>
  
  // Find all case blocks - they start with "<table width="100%"" after a "</table>"
  const tables = html.split('</table>');
  
  for (const table of tables) {
    // Skip tables without data rows (header table, empty, etc.)
    if (!table.includes('valign="top"') || !table.includes('padding-top:10px;')) continue;

    // Check if this table has a Sr.# (data row)
    const srMatch = table.match(/<td[^>]*>\s*(\d+)\s*<br\s*\/?>\s*<\/td>/);
    if (!srMatch) continue;

    // Extract case type and number (column 2)
    const caseMatch = table.match(/<td[^>]*width="10%"[^>]*>\s*(.*?)<br\s*\/?>\s*(.*?)<\/td>/s);
    const caseType = caseMatch ? caseMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const caseNumber = caseMatch ? caseMatch[2].replace(/<[^>]+>/g, '').trim() : '';

    // Extract parties (column 3 - width=20%)
    const partiesMatch = table.match(/<td[^>]*width="20%"[^>]*>\s*(.*?)<\/td>/s);
    let parties = '';
    if (partiesMatch) {
      parties = partiesMatch[1]
        .replace(/<strong>VS<\/strong>/gi, ' Vs ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Extract judge (column 4 - uses <th> not <td>)
    const judgeMatch = table.match(/<th[^>]*>\s*(.*?)<\/th>/s);
    const judge = judgeMatch ? judgeMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract decision date (first width=10% TD after judge)
    const dateMatch = table.match(/<td[^>]*width="10%"[^>]*>\s*(\d{2}-\d{2}-\d{4})\s*<\/td>/);
    const decisionDate = dateMatch ? dateMatch[1] : '';

    // Extract LHC citation
    const citMatch = table.match(/<td[^>]*>\s*(202\d\s+LHC\s+\d+)\s*<\/td>/);
    const lhcCitation = citMatch ? citMatch[1] : '';
    
    // If not found with exact pattern, try broader
    const citMatch2 = table.match(/202\d\s+LHC\s+\d+/);
    const lhcCitation2 = citMatch2 ? citMatch2[0] : '';

    // Extract other citations (with specific background color)
    const otherMatch = table.match(/background-color:#FFC[^>]*>\s*(.*?)\s*<\/td>/s);
    const otherCitations = otherMatch ? otherMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract tagline
    const tagMatch = table.match(/Tag Line:\s*<\/strong>(.*?)(?:<\/td>|$)/s);
    const tagline = tagMatch ? tagMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';

    results.push({
      caseType,
      caseNumber: caseNumber || caseType,
      parties,
      judge,
      decisionDate,
      lhcCitation: lhcCitation || lhcCitation2,
      otherCitations,
      tagline,
    });
  }

  return results;
}

async function fetchYear(year) {
  const url = `${BASE}/dynamic/approved_judgments_result_new.php?year=${year}&debug=0&courtName=All%20Courts&caseNumber=&citationTag=&partyName=&decisionDate0=&decisionDate1=&uploadDate=&uploadDate1=`;
  console.log(`Fetching ${url}`);
  
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();
  console.log(`  Response size: ${(html.length / 1024).toFixed(0)} KB`);
  
  return parseLHCResponse(html);
}

async function main() {
  const years = [2025, 2024];
  const allCases = [];
  const seen = new Set();

  for (const yr of years) {
    try {
      const cases = await fetchYear(yr);
      for (const c of cases) {
        const key = c.lhcCitation || `${c.caseNumber}-${c.parties}`;
        if (!seen.has(key)) {
          seen.add(key);
          allCases.push(c);
        }
      }
      console.log(`  ${cases.length} cases for ${yr}`);
    } catch (err) {
      console.log(`Error for year ${yr}:`, err.message);
    }
  }

  console.log(`\nTotal unique LHC cases: ${allCases.length}`);

  if (allCases.length === 0) {
    console.log('No cases found. Try adjusting parser.');
    fs.writeFileSync(OUTPUT, JSON.stringify(allCases, null, 2));
    return;
  }

  const mapped = allCases.map(c => {
    const citation = c.lhcCitation || '';
    const year = parseInt(citation.match(/\b(20\d{2})\b/)?.[1]) || parseInt(c.caseNumber.match(/\b(20\d{2})\b/)?.[1]) || 2025;

    let cat = 'Civil';
    const ct = (c.caseType || '').toLowerCase();
    if (ct.includes('crl') || ct.includes('bail') || ct.includes('criminal') || ct.includes('jail')) cat = 'Criminal';
    else if (ct.includes('writ') || ct.includes('constitution')) cat = 'Constitutional';
    else if (ct.includes('service') || ct.includes('recruitment') || ct.includes('promotion') || ct.includes('pension')) cat = 'Service';
    else if (ct.includes('tax') || ct.includes('duties') || ct.includes('property tax')) cat = 'Tax';
    else if (ct.includes('rent') || ct.includes('ejectment')) cat = 'Property';
    else if (ct.includes('family')) cat = 'Family';

    const desc = [
      c.tagline ? `Tag Line: ${c.tagline}` : '',
      c.judge ? `Bench: ${c.judge}` : '',
      c.decisionDate ? `Decided: ${c.decisionDate}` : '',
      c.otherCitations ? `Other Citations: ${c.otherCitations}` : '',
    ].filter(Boolean).join('\n\n');

    return {
      title: c.parties,
      citation,
      court: 'Lahore High Court',
      year,
      parties: c.parties,
      category: cat,
      description: desc.slice(0, 500),
      keywords: c.tagline || c.caseType || '',
    };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(mapped, null, 2));
  console.log(`Saved ${mapped.length} mapped cases to ${OUTPUT}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
