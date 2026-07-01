import puppeteer from 'puppeteer';

const CHROME = '/usr/bin/google-chrome';

async function probeLHC() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

  // Try the LHC data portal
  console.log('=== Probing LHC data portal ===');
  try {
    await page.goto('https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    console.log('Body:', bodyText);

    // Check for any forms/inputs
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('select, input, form')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type || '',
        className: el.className,
      }));
    });
    console.log('Inputs:', JSON.stringify(inputs, null, 2));
  } catch (e) {
    console.log('data.lhc.gov.pk failed:', e.message);
  }

  // Try the main LHC site
  console.log('\n=== Probing LHC main site ===');
  try {
    await page.goto('https://www.lhc.gov.pk/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Title:', await page.title());

    // Look for judgment links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="judgment"], a[href*="judgement"], a[href*="caselaw"], a[href*="case_law"]'))
        .map(a => ({ text: a.textContent.trim(), href: a.href }));
    });
    console.log('Judgment links:', JSON.stringify(links, null, 2));
  } catch (e) {
    console.log('lhc.gov.pk failed:', e.message);
  }

  await browser.close();
}

probeLHC().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
