import puppeteer from 'puppeteer';
import fs from 'fs';

const CHROME = '/usr/bin/google-chrome';
const BASE = 'https://www.peshawarhighcourt.gov.pk';
const OUTPUT = 'phc-judgments.json';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function scrapePHC(page, year) {
  console.log(`\n=== PHC: year=${year} ===`);

  await page.goto(`${BASE}/PHCCMS/reportedJudgments.php`, { waitUntil: 'networkidle2', timeout: 30000 });

  await page.select('#year', String(year));
  await page.select('#judge', '0');
  await page.select('#category', '0');

  await page.click('input[value="search"]');

  // Wait for results table
  try {
    await page.waitForSelector('#employee_list', { timeout: 15000 });
    await sleep(2000);
  } catch {
    console.log('  No results table found.');
    return [];
  }

  // Set page length to 100
  await page.evaluate(() => {
    const sel = document.querySelector('select[name="employee_list_length"]');
    if (sel) { sel.value = '100'; sel.dispatchEvent(new Event('change')); }
  });
  await sleep(2000);

  const allCases = [];
  let pageNum = 1;

  while (true) {
    console.log(`  Page ${pageNum}...`);

    const pageCases = await page.evaluate(() => {
      const rows = document.querySelectorAll('#employee_list tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 10) return null;

        const caseCell = cells[1]?.textContent?.trim() || '';
        // Extract caseNo and parties from format like "C.R No. 204-P of 2022 Abdul Qayum Khattak Vs Abu-ul-Hassan & others"
        let caseNo = caseCell;
        let parties = caseCell;
        const m = caseCell.match(/^((?:[A-Za-z]+\.?\s*)*No\.\s*[^\s]+(?:\s+of\s*\d{4})?)\s+(.+)/);
        if (m) { caseNo = m[1].trim(); parties = m[2].trim(); }

        return {
          caseNo,
          parties,
          remarks: cells[2]?.textContent?.trim() || '',
          otherCitation: cells[3]?.textContent?.trim() || '',
          phcCitation: cells[4]?.textContent?.trim() || '',
          decisionDate: cells[5]?.textContent?.trim() || '',
          scStatus: cells[6]?.textContent?.trim() || '',
          category: cells[7]?.textContent?.trim() || '',
          pdfUrl: cells[8]?.querySelector('a')?.getAttribute('href') || '',
        };
      }).filter(Boolean);
    });

    allCases.push(...pageCases);
    console.log(`    ${pageCases.length} rows (total: ${allCases.length})`);

    // Try next page via DataTables API
    const hasNext = await page.evaluate(() => {
      const btn = document.querySelector('#employee_list_next');
      return btn && !btn.classList.contains('disabled');
    });

    if (!hasNext) break;

    await page.evaluate(() => {
      const btn = document.querySelector('#employee_list_next a');
      if (btn) btn.click();
    });
    await sleep(2500);
    pageNum++;
  }

  return allCases;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

  const years = [2025, 2024];
  const allCases = [];
  const seen = new Set();

  for (const yr of years) {
    try {
      const cases = await scrapePHC(page, yr);
      console.log(`  Got ${cases.length} cases for ${yr}`);
      for (const c of cases) {
        const key = c.caseNo;
        if (!seen.has(key)) {
          seen.add(key);
          allCases.push(c);
        }
      }
    } catch (err) {
      console.log(`Error for year ${yr}:`, err.message);
    }
  }

  console.log(`\nTotal unique PHC cases: ${allCases.length}`);

  const mapped = allCases.map(c => {
    const citation = c.phcCitation || c.otherCitation || '';
    const yr = parseInt(c.caseNo.match(/\b(20\d{2})\b/)?.[1]) ||
               parseInt(citation.match(/\b(20\d{2})\b/)?.[1]) ||
               2025;

    let category = 'Civil';
    const cat = (c.category || '').toLowerCase();
    if (cat.includes('criminal')) category = 'Criminal';
    else if (cat.includes('constitution')) category = 'Constitutional';
    else if (cat.includes('service')) category = 'Service';
    else if (cat.includes('revenu') || cat.includes('tax')) category = 'Tax';
    else if (cat.includes('corporate')) category = 'Corporate';

    const description = [
      c.remarks || '',
      c.decisionDate ? `Decided: ${c.decisionDate}` : '',
      c.scStatus ? `SC Status: ${c.scStatus}` : '',
    ].filter(Boolean).join('\n\n');

    return {
      title: c.parties,
      citation,
      court: 'Peshawar High Court',
      year: yr,
      parties: c.parties,
      category,
      description: description.slice(0, 500),
      keywords: c.remarks ? c.remarks.slice(0, 200) : '',
    };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(mapped, null, 2));
  console.log(`Saved ${mapped.length} mapped cases to ${OUTPUT}`);

  await browser.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
