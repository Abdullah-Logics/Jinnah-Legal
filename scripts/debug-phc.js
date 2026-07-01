import puppeteer from 'puppeteer';
import fs from 'fs';

const CHROME = '/usr/bin/google-chrome';
const BASE = 'https://www.peshawarhighcourt.gov.pk';

async function debugPHC() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('response', r => {
    if (r.url().includes('reportedJudgments')) {
      console.log(`Response: ${r.status()} ${r.url()}`);
    }
  });

  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

  // Load the page
  await page.goto(`${BASE}/PHCCMS/reportedJudgments.php`, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Page title:', await page.title());
  
  // Print the form HTML
  const formHtml = await page.evaluate(() => {
    const form = document.querySelector('form');
    return form ? form.innerHTML.slice(0, 2000) : 'NO FORM';
  });
  console.log('Form HTML:', formHtml);

  // Submit form
  await page.select('#year', '2025');
  await page.select('#judge', '0');
  await page.select('#category', '0');
  
  console.log('Submitting...');
  await page.click('input[value="search"]');
  
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('After submit URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  console.log('Body:', bodyText);

  // Check for any tables
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map(t => ({
      id: t.id,
      class: t.className,
      rows: t.rows.length,
      html: t.innerHTML.slice(0, 500)
    }));
  });
  console.log('Tables:', JSON.stringify(tables, null, 2));

  await browser.close();
}

debugPHC().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
