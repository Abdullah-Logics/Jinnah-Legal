import puppeteer from 'puppeteer';

const CHROME = '/usr/bin/google-chrome';
const BASE = 'https://www.peshawarhighcourt.gov.pk';

async function debugPHC() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

  await page.goto(`${BASE}/PHCCMS/reportedJudgments.php`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.select('#year', '2025');
  await page.click('input[value="search"]');
  await page.waitForSelector('#employee_list', { timeout: 15000 });
  
  // Set length to 100
  await page.evaluate(() => {
    const sel = document.querySelector('select[name="employee_list_length"]');
    if (sel) { sel.value = '100'; sel.dispatchEvent(new Event('change')); }
  });
  await new Promise(r => setTimeout(r, 2000));

  // Print first 3 rows
  const sample = await page.evaluate(() => {
    const rows = document.querySelectorAll('#employee_list tbody tr');
    return Array.from(rows).slice(0, 3).map(row => {
      const cells = row.querySelectorAll('td');
      return {
        html: Array.from(cells).map(c => c.innerHTML.slice(0, 200)),
        text: Array.from(cells).map(c => c.textContent.trim().slice(0, 150)),
        count: cells.length,
      };
    });
  });
  console.log(JSON.stringify(sample, null, 2));

  // Check total count info
  const info = await page.evaluate(() => {
    const el = document.querySelector('#employee_list_info');
    return el ? el.textContent : 'NO INFO';
  });
  console.log('Info:', info);

  await browser.close();
}

debugPHC().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
