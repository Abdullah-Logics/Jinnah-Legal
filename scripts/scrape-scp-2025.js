import puppeteer from 'puppeteer';
import fs from 'fs';

const URL = 'https://www.supremecourt.gov.pk/judgement-search/';
const OUTPUT = 'scp-2025-results.json';
const CHROME = '/usr/bin/google-chrome';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runSearch(page, year, reported) {
  console.log(`\n=== Searching: year=${year}, reported=${reported} ===`);

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#case_year option', { timeout: 15000 });
  await page.waitForSelector('#reported option', { timeout: 5000 });

  await page.select('#case_year', String(year));
  await sleep(500);
  if (reported) {
    await page.select('#reported', reported);
  }
  await sleep(500);

  console.log('Clicking Search Result...');
  await page.click('input[value="Search Result"]');

  // Wait for results
  try {
    await page.waitForSelector('#resultsRow', { timeout: 30000 });
    await sleep(2000);

    // Check if resultsRow is visible
    const visible = await page.evaluate(() => {
      const el = document.getElementById('resultsRow');
      return el ? window.getComputedStyle(el).display !== 'none' : false;
    });

    if (!visible) {
      console.log('resultsRow is hidden - no results.');
      return [];
    }
  } catch {
    console.log('Timeout waiting for results - no results.');
    return [];
  }

  // Wait for table to populate
  await page.waitForFunction(() => {
    const tbody = document.querySelector('#historyBody');
    return tbody && tbody.children.length > 0;
  }, { timeout: 15000 });

  await sleep(2000);

  // Set length to 100 if available
  try {
    await page.evaluate(() => {
      const sel = document.querySelector('select[name="resultsTable_length"]');
      if (sel) {
        sel.value = '100';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(1500);
  } catch (e) {
    console.log('Could not set length:', e.message);
  }

  const allCases = [];
  let pageNum = 1;

  while (true) {
    console.log(`  Page ${pageNum}...`);

    // Wait for data to settle
    await sleep(1000);

    const pageCases = await page.evaluate(() => {
      const rows = document.querySelectorAll('#historyBody tr.citationCase');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        const pdfLink = row.querySelector('a[href*="/downloads_judgements/"]');
        return {
          caseSubject: cells[1]?.textContent?.trim() || '',
          caseNumber: cells[2]?.textContent?.trim() || '',
          caseTitle: cells[3]?.textContent?.trim() || '',
          authorJudge: cells[4]?.textContent?.trim() || '',
          dateCreated: cells[5]?.textContent?.trim() || '',
          dateOfAnnouncement: cells[6]?.textContent?.trim() || '',
          citation: cells[7]?.textContent?.trim() || '',
          SCPCitation: cells[8]?.textContent?.trim() || '',
          pdfUrl: pdfLink ? pdfLink.getAttribute('href') : '',
        };
      });
    });

    // Get taglines from following sibling rows
    const taglines = await page.evaluate(() => {
      const rows = document.querySelectorAll('#historyBody tr');
      const tags = [];
      rows.forEach(row => {
        if (row.querySelector('strong') && row.innerHTML.includes('Tagline')) {
          const text = row.querySelector('strong')?.textContent?.trim() || '';
          tags.push(text.replace('Tagline :', '').trim());
        }
      });
      return tags;
    });

    pageCases.forEach((c, i) => {
      if (taglines[i]) c.tagline = taglines[i];
    });

    allCases.push(...pageCases);
    console.log(`    Got ${pageCases.length} rows (total: ${allCases.length})`);

    // Check for next page
    const nextBtn = await page.$('a.paginate_button.next');
    if (!nextBtn) break;

    const disabled = await page.evaluate(el => el.classList.contains('disabled'), nextBtn);
    if (disabled) break;

    await nextBtn.click();
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

  // Try multiple search combinations
  const searches = [
    { year: 2025, reported: '' },
    { year: 2025, reported: 'yes' },
    { year: 2025, reported: 'no' },
    { year: 2026, reported: '' },
  ];

  const allResults = [];

  for (const s of searches) {
    let results;
    try {
      results = await runSearch(page, s.year, s.reported);
    } catch (err) {
      console.log(`Search failed for ${JSON.stringify(s)}:`, err.message);
      results = [];
    }
    allResults.push({ ...s, count: results.length, cases: results });
  }

  // Deduplicate across all searches
  const seen = new Set();
  const allUnique = [];
  for (const batch of allResults) {
    for (const c of batch.cases) {
      const key = c.caseNumber || c.pdfUrl;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      allUnique.push(c);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  for (const r of allResults) {
    console.log(`  year=${r.year}, reported=${r.reported}: ${r.count} cases`);
  }
  console.log(`  Total unique: ${allUnique.length}`);

  // Map to our DB schema
  const mapped = allUnique.map(c => {
    const parties = c.caseTitle.includes(' v. ')
      ? c.caseTitle.split(' v. ').map(s => s.trim()).join(' v. ')
      : c.caseTitle;

    const citation = c.SCPCitation && c.SCPCitation !== 'N/A'
      ? c.SCPCitation
      : (c.citation && c.citation !== 'N/A' ? c.citation : '');

    const year = citation ? parseInt(citation.match(/\b(20\d{2})\b/)?.[1] || '2025') : 2025;

    const description = [
      c.caseSubject,
      c.tagline || '',
      c.authorJudge ? `Bench: ${c.authorJudge}` : '',
      c.dateOfAnnouncement !== 'N/A' ? `Announced: ${c.dateOfAnnouncement}` : '',
    ].filter(Boolean).join('\n\n');

    let category = 'Civil';
    const subj = (c.caseSubject || '').toLowerCase();
    if (subj.includes('criminal') || subj.includes('bail') || subj.includes('murder') || subj.includes('penal') || c.caseNumber?.startsWith('Crl')) {
      category = 'Criminal';
    } else if (subj.includes('constitution') || subj.includes('fundamental right') || subj.includes('human right')) {
      category = 'Constitutional';
    } else if (subj.includes('tax') || subj.includes('income tax') || subj.includes('sales tax')) {
      category = 'Tax';
    } else if (subj.includes('service') || subj.includes('promotion') || subj.includes('pension') || subj.includes('seniority')) {
      category = 'Service';
    } else if (subj.includes('rent') || subj.includes('ejectment') || subj.includes('property')) {
      category = 'Property';
    } else if (subj.includes('bank') || subj.includes('npl') || subj.includes('recovery')) {
      category = 'Banking';
    }

    return {
      title: c.caseTitle,
      citation,
      court: 'Supreme Court of Pakistan',
      year,
      parties,
      category,
      description: description.slice(0, 500),
      keywords: `${c.caseSubject}, ${c.authorJudge ? `Judge: ${c.authorJudge}` : ''}`,
      full_text: description,
    };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(mapped, null, 2));
  console.log(`\nSaved ${mapped.length} mapped cases to ${OUTPUT}`);

  await browser.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
