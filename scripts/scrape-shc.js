import fs from 'fs';

const BASE = 'https://caselaw.shc.gov.pk/caselaw';
const OUTPUT = 'shc-afr-judgments.json';

function parseAFRPage(html, judgeCode, judgeName) {
  const results = [];

  const rowRegex = /<tr>[\s\S]*?<\/tr>/g;
  const rows = html.match(rowRegex) || [];

  for (const row of rows) {
    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g);
    if (!cells || cells.length < 13) continue;

    // SHC table has 14 columns:
    // 0: code (hidden), 1: S.No., 2: Citation, 3: Case No. (with link),
    // 4: Case Type, 5: Case Year, 6: Parties, 7: Bench (hidden),
    // 8: Order Date, 9: AFR, 10: Head Notes, 11: Bench, 12: Apex Court, 13: Apex Status
    const sno = cells[1]?.replace(/<[^>]+>/g, '').trim() || '';
    if (!sno || sno === 'S.No.') continue;

    const citation = cells[2]?.replace(/<[^>]+>/g, '').trim() || '';

    const caseNoMatch = cells[3]?.match(/<a[^>]*>([\s\S]*?)<\/a>/);
    const caseNo = caseNoMatch ? caseNoMatch[1].replace(/<[^>]+>/g, '').trim() : cells[3]?.replace(/<[^>]+>/g, '').replace(/-->\s*$/, '').trim() || '';

    const caseType = cells[4]?.replace(/<[^>]+>/g, '').trim() || '';

    const caseYear = cells[5]?.replace(/<[^>]+>/g, '').trim() || '';

    const parties = cells[6]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';

    const orderDate = cells[8]?.replace(/<[^>]+>/g, '').trim() || '';

    const afr = cells[9]?.replace(/<[^>]+>/g, '').trim() || '';

    const headNotes = cells[10]?.replace(/<[^>]+>/g, '').trim() || '';

    const bench = cells[11]?.replace(/<[^>]+>/g, '').trim() || '';

    const apexCourt = cells[12]?.replace(/<[^>]+>/g, '').trim() || '';

    const apexStatus = cells[13]?.replace(/<[^>]+>/g, '').trim() || '';

    if (!caseNo && !citation) continue;

    results.push({
      judgeCode,
      judgeName,
      sno,
      citation,
      caseNo,
      caseType,
      caseYear,
      parties,
      orderDate,
      afr,
      headNotes,
      bench,
      apexCourt,
      apexStatus,
    });
  }

  return results;
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'Nil') return '';
  const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
                   JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
  const m = dateStr.match(/(\d{2})-([A-Z]{3})-(\d{2})$/);
  if (m) {
    const year = parseInt(m[3]) + 2000;
    return `${year}-${months[m[2]]}-${m[1]}`;
  }
  return dateStr;
}

function categorize(caseType, caseNo, citation, headNotes, parties) {
  const txt = [caseType, caseNo, citation, headNotes, parties].filter(Boolean).join(' ').toLowerCase();

  if (txt.includes('crl') || txt.includes('bail') || txt.includes('criminal') || txt.includes('jail')
      || txt.includes('crime') || txt.includes('murder') || txt.includes('offence')
      || txt.includes('narcotics') || txt.includes('cheque') || txt.includes('nab')
      || txt.includes('corruption') || txt.includes('sentence') || txt.includes('conviction'))
    return 'Criminal';

  if (txt.includes('constitution') || txt.includes('writ petition') || txt.includes('fundamental rights')
      || txt.includes('constitutional') || txt.includes('human rights') || txt.includes('article'))
    return 'Constitutional';

  if (txt.includes('service') || txt.includes('recruitment') || txt.includes('promotion') || txt.includes('pension')
      || txt.includes('employee') || txt.includes('appointment') || txt.includes('departmental'))
    return 'Service';

  if (txt.includes('tax') || txt.includes('sales tax') || txt.includes('income tax') || txt.includes('duties')
      || txt.includes('customs') || txt.includes('excise'))
    return 'Tax';

  if (txt.includes('rent') || txt.includes('ejectment') || txt.includes('eviction') || txt.includes('property')
      || txt.includes('possession') || txt.includes('land'))
    return 'Property';

  if (txt.includes('family') || txt.includes('divorce') || txt.includes('khula') || txt.includes('maintenance')
      || txt.includes('guardian') || txt.includes('nikah') || txt.includes('child custody'))
    return 'Family';

  if (txt.includes('contract') || txt.includes('agreement') || txt.includes('arbitration')
      || txt.includes('recovery') || txt.includes('commercial'))
    return 'Commercial';

  if (txt.includes('c.p.') || txt.includes('const.p') || txt.includes('constitution petition'))
    return 'Constitutional';

  return 'Civil';
}

async function main() {
  console.log('Fetching AFR judge list...');
  const listResp = await fetch(`${BASE}/public/rpt-afr`);
  const listHtml = await listResp.text();

  const judgeLinks = [];
  const linkRegex = /<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<a[^>]*href="public\/reported-judgements-detail-all\/(\d+)\/AFR\/AFR"[^>]*>(\d+)<\/a>/g;
  const judgeNameRegex = /<td[^>]*>Hon'ble[^<]*<\/td>/g;
  const nameMatch = listHtml.match(/<tr>[\s\S]*?<\/tr>/g) || [];

  for (const row of nameMatch) {
    const linkMatch = row.match(/href="public\/reported-judgements-detail-all\/(\d+)\/AFR\/AFR"[^>]*>(\d+)<\/a>/);
    const nameM = row.match(/<td[^>]*>\s*Hon'ble([^<]*)<\/td>/);
    if (linkMatch) {
      const count = parseInt(linkMatch[2]);
      if (count > 0) {
        judgeLinks.push({
          code: linkMatch[1],
          name: nameM ? 'Hon\'ble' + nameM[1].trim() : 'Unknown',
          count,
        });
      }
    }
  }

  console.log(`Found ${judgeLinks.length} judges with AFR cases`);
  
  const allCases = [];
  let done = 0;

  for (const judge of judgeLinks) {
    done++;
    console.log(`[${done}/${judgeLinks.length}] Fetching Judge ${judge.name} (${judge.code}) - ${judge.count} AFR cases...`);
    
    try {
      const resp = await fetch(`${BASE}/public/reported-judgements-detail-all/${judge.code}/AFR/AFR`);
      const html = await resp.text();
      
      const parsed = parseAFRPage(html, judge.code, judge.name);
      console.log(`  Parsed ${parsed.length} cases`);
      
      for (const c of parsed) {
        allCases.push(c);
      }
      
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`  Error for judge ${judge.code}:`, err.message);
    }
  }

  console.log(`\nTotal parsed cases: ${allCases.length}`);

  const mapped = allCases.map(c => {
    const citation = c.citation && c.citation !== 'Nil' ? c.citation : '';
    const year = c.caseYear ? parseInt(c.caseYear) : (citation.match(/\b(20\d{2})\b/)?.[1] ? parseInt(citation.match(/\b(20\d{2})\b/)[1]) : 0);

    const cat = categorize(c.caseType, c.caseNo, c.citation, c.headNotes, c.parties);

    const orderDate = formatDate(c.orderDate);

    const desc = [
      c.headNotes ? `Head Notes: ${c.headNotes}` : '',
      c.bench ? `Bench: ${c.bench}` : '',
      c.judgeName ? `Judge: ${c.judgeName}` : '',
      orderDate ? `Decided: ${orderDate}` : '',
      c.apexCourt ? `Apex Court: ${c.apexCourt}` : '',
      c.apexStatus ? `Apex Status: ${c.apexStatus}` : '',
    ].filter(Boolean).join('\n\n');

    return {
      title: c.parties || c.caseNo,
      citation,
      court: 'Sindh High Court',
      year,
      parties: c.parties,
      category: cat,
      description: desc.slice(0, 500),
      keywords: c.headNotes || c.caseType || '',
    };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(mapped, null, 2));
  console.log(`Saved ${mapped.length} mapped cases to ${OUTPUT}`);

  const withCitation = mapped.filter(c => c.citation);
  console.log(`Cases with citation: ${withCitation.length}`);
  
  const years = {};
  for (const c of mapped) {
    const y = c.year || 0;
    years[y] = (years[y] || 0) + 1;
  }
  console.log('Year distribution:', Object.entries(years).sort((a, b) => b[0] - a[0]).slice(0, 20).map(([y, n]) => `${y}: ${n}`).join(', '));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
