import puppeteer from 'puppeteer';

const CHROME = '/usr/bin/google-chrome';

async function probeLHCAjax() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

  // Intercept XHR requests
  const xhrs = [];
  page.on('response', r => {
    if (r.url().includes('approved_judgments_result_new') || r.url().includes('dynamic')) {
      xhrs.push({ url: r.url(), status: r.status() });
    }
  });

  await page.goto('https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Select year 2025
  await page.select('#year', '2025');

  // Click search button
  await page.click('#appjudgmentbtn');
  await new Promise(r => setTimeout(r, 5000));

  console.log('XHRs caught:', JSON.stringify(xhrs, null, 2));

  // Try to inspect the AJAX call from page source
  const scripts = await page.evaluate(() => {
    const sc = document.querySelectorAll('script');
    return Array.from(sc).map(s => s.textContent).filter(t => t.includes('approved') || t.includes('appjudgmentbtn') || t.includes('ajax'));
  });
  console.log('Relevant scripts:', scripts.length ? scripts[0].slice(0, 3000) : 'none');

  // Look for the results table
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map(t => ({
      id: t.id,
      class: t.className,
      rows: t.rows.length,
      html: t.innerHTML.slice(0, 500)
    }));
  });
  console.log('Tables:', JSON.stringify(tables, null, 2));

  // Check the page body for results
  const bodyText = await page.evaluate(() => document.body.innerText.slice(2000, 4000));
  console.log('Body text:', bodyText);

  await browser.close();
}

probeLHCAjax().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
