import fs from 'fs';

const BASE = 'https://www.federalshariatcourt.gov.pk';
const OUTPUT = 'fsc-judgments.json';

function parseFSCPage(html) {
    const results = [];
    const rowRegex = /<tr>[\s\S]*?<\/tr>/g;
    const rows = html.match(rowRegex) || [];

    for (const row of rows) {
        if (!row.includes('<td') || row.includes('<th')) continue;
        const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g);
        if (!cells || cells.length < 10) continue;

        const sno = cells[0]?.replace(/<[^>]+>/g, '').trim() || '';
        if (!sno || sno === 'Sr. No') continue;

        const caseNo = cells[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
        const title = cells[2]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
        const subject = cells[3]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
        const bench = cells[4]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
        const judgmentDate = cells[5]?.replace(/<[^>]+>/g, '').trim() || '';
        const sections = cells[6]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
        const citation = cells[7]?.replace(/<[^>]+>/g, '').trim() || '';
        const yearStr = cells[8]?.replace(/<[^>]+>/g, '').trim() || '';
        const downloadLink = cells[9]?.match(/href=['"]([^'"]+)['"]/);
        const pdfUrl = downloadLink ? downloadLink[1] : '';

        const year = parseInt(yearStr) || 0;

        // Categorize
        let category = 'Civil';
        const txt = [caseNo, title, subject, sections].filter(Boolean).join(' ').toLowerCase();
        if (txt.includes('criminal') || txt.includes('jail') || txt.includes('murder') || txt.includes('bail'))
            category = 'Criminal';
        else if (txt.includes('shariat') || txt.includes('constitution') || txt.includes('hudood') || txt.includes('islamic'))
            category = 'Constitutional';
        else if (txt.includes('family') || txt.includes('divorce') || txt.includes('maintenance') || txt.includes('nikah'))
            category = 'Family';
        else if (txt.includes('property') || txt.includes('land') || txt.includes('possession') || txt.includes('rent'))
            category = 'Property';
        else if (txt.includes('service') || txt.includes('pension') || txt.includes('appointment'))
            category = 'Service';
        else if (txt.includes('tax') || txt.includes('custom') || txt.includes('sales tax'))
            category = 'Tax';

        const description = [
            subject ? `Subject: ${subject}` : '',
            sections ? `Section: ${sections}` : '',
            bench ? `Bench: ${bench}` : '',
            judgmentDate ? `Decided: ${judgmentDate}` : '',
            pdfUrl ? `PDF: ${BASE}/${pdfUrl}` : '',
        ].filter(Boolean).join('\n');

        const parties = title;
        // Extract meaningful parties name (remove "VERSUS" formatting)
        const partyName = title.replace(/\s*VERSUS\s*/i, ' v. ').replace(/\s+/g, ' ').trim();

        results.push({
            title: partyName || caseNo,
            citation: citation || '',
            court: 'Federal Shariat Court',
            year,
            parties: partyName || '',
            category,
            description: description.slice(0, 500),
            keywords: [subject, sections].filter(Boolean).join(', '),
        });
    }

    return results;
}

async function main() {
    console.log('Fetching FSC Reported Judgments...');
    const resp = await fetch(`${BASE}/judgement.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'txtSearch=&Search=Search',
    });
    const html = await resp.text();

    // Check for pagination
    const totalMatch = html.match(/Total\s*(?:Records?|:)?\s*(\d+)/i);
    console.log(`Total records: ${totalMatch ? totalMatch[1] : 'unknown'}`);

    const page1 = parseFSCPage(html);
    console.log(`Page 1: ${page1.length} cases`);

    // Check for more pages
    const pageLinks = html.match(/judgement\.php\?page=(\d+)/g);
    const maxPage = pageLinks ? Math.max(...pageLinks.map(l => parseInt(l.match(/\d+/)[0]))) : 1;
    console.log(`Total pages: ${maxPage}`);

    const allCases = [...page1];

    for (let p = 2; p <= maxPage; p++) {
        console.log(`Fetching page ${p}/${maxPage}...`);
        const resp = await fetch(`${BASE}/judgement.php?page=${p}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'txtSearch=&Search=Search',
        });
        const html = await resp.text();
        const cases = parseFSCPage(html);
        allCases.push(...cases);
        console.log(`  ${cases.length} cases`);
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\nTotal FSC cases scraped: ${allCases.length}`);

    fs.writeFileSync(OUTPUT, JSON.stringify(allCases, null, 2));
    console.log(`Saved to ${OUTPUT}`);

    // Stats
    const years = {};
    for (const c of allCases) {
        years[c.year] = (years[c.year] || 0) + 1;
    }
    console.log('Year distribution:', Object.entries(years).sort((a, b) => b[0] - a[0]).slice(0, 20).map(([y, n]) => `${y}: ${n}`).join(', '));
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
