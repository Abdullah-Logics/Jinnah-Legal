import fs from 'fs';

const BASE = 'https://mis.ihc.gov.pk';
const OUTPUT = 'ihc-judgments.json';

async function searchIHC(year, month) {
    const startDate = `01-${String(month).padStart(2, '0')}-${year}`;
    
    const body = JSON.stringify({
        PCASENO: "0",
        PJUG: "0",
        PADV: "0",
        PYEAR: String(year),
        pPrty: "",
        PDDATE: startDate,
        PLANDMARK: "1",
        PAFR: "9999"
    });
    
    try {
        const resp = await fetch(`${BASE}/ihc.asmx/srchDecision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body,
            signal: AbortSignal.timeout(30000),
        });
        
        const text = await resp.text();
        const d = JSON.parse(text);
        
        if (d.d === '"empty"') return [];
        
        const data = JSON.parse(d.d);
        if (!Array.isArray(data)) return [];
        
        return data.map(c => {
            let caseYear = year;
            if (c.DDATE) {
                const ym = c.DDATE.match(/(\d{4})/);
                if (ym) caseYear = parseInt(ym[1]);
            }
            
            let category = 'Civil';
            const txt = [c.O_SUBJECT || '', c.PARTIES || '', c.CASENO || ''].join(' ').toLowerCase();
            if (txt.includes('crl') || txt.includes('criminal') || txt.includes('bail') || txt.includes('murder') || txt.includes('nab') || txt.includes('cheque') || txt.includes('offence'))
                category = 'Criminal';
            else if (txt.includes('wp') || txt.includes('writ') || txt.includes('constitution') || txt.includes('fundamental') || txt.includes('human right'))
                category = 'Constitutional';
            else if (txt.includes('service') || txt.includes('pension') || txt.includes('appointment') || txt.includes('promotion') || txt.includes('employee') || txt.includes('termination'))
                category = 'Service';
            else if (txt.includes('family') || txt.includes('divorce') || txt.includes('khula') || txt.includes('maintenance') || txt.includes('guardian'))
                category = 'Family';
            else if (txt.includes('rent') || txt.includes('property') || txt.includes('possession') || txt.includes('ejectment') || txt.includes('land') || txt.includes('dispossession'))
                category = 'Property';
            else if (txt.includes('tax') || txt.includes('income tax') || txt.includes('sales tax'))
                category = 'Tax';
            else if (txt.includes('bank') || txt.includes('recovery') || txt.includes('loan'))
                category = 'Banking';
            
            const desc = [
                c.O_SUBJECT ? `Subject: ${c.O_SUBJECT}` : '',
                c.O_REMARKS ? `Remarks: ${c.O_REMARKS}` : '',
                c.O_UNDERSECTION ? `Laws: ${c.O_UNDERSECTION}` : '',
                c.BENCHNAME ? `Bench: ${c.BENCHNAME}` : '',
                c.AUTHOR_JUDGES ? `Author: ${c.AUTHOR_JUDGES}` : '',
                c.DDATE ? `Date: ${c.DDATE}` : '',
            ].filter(Boolean).join('\n');
            
            const parties = (c.PARTIES || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            // Use CASECODE as unique dedup identifier
            const uniqueId = c.CASECODE ? `IHC-${c.CASECODE}` : `IHC-${c.O_ID || ''}`;
            
            return {
                title: parties || c.CASENO || '',
                citation: uniqueId,
                court: 'Islamabad High Court',
                year: caseYear,
                parties: parties,
                category,
                description: desc.slice(0, 500),
                keywords: [c.O_SUBJECT, c.O_UNDERSECTION].filter(Boolean).join(', '),
            };
        });
    } catch (err) {
        return [];
    }
}

async function main() {
    console.log('Scraping IHC Case Law System...\n');
    
    const allCases = [];
    const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
    
    for (const year of years) {
        console.log(`Year ${year}:`);
        for (let month = 1; month <= 12; month++) {
            const cases = await searchIHC(year, month);
            if (cases.length > 0) {
                console.log(`  Month ${month}: ${cases.length}`);
                allCases.push(...cases);
            }
            await new Promise(r => setTimeout(r, 800));
        }
        console.log(`  Subtotal: ${allCases.length}`);
    }
    
    console.log(`\nTotal IHC cases scraped: ${allCases.length}`);
    
    if (allCases.length > 0) {
        fs.writeFileSync(OUTPUT, JSON.stringify(allCases, null, 2));
        console.log(`Saved to ${OUTPUT}`);
        
        const yearStats = {};
        for (const c of allCases) yearStats[c.year] = (yearStats[c.year] || 0) + 1;
        console.log('Years:', Object.entries(yearStats).sort((a, b) => b[0] - a[0]).map(([y, n]) => `${y}:${n}`).join(', '));
    }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
