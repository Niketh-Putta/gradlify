const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQ FAILURE:', request.url(), request.failure().errorText));

  console.log("Navigating...");
  try {
    await page.goto('http://localhost:3000/11-plus', { waitUntil: 'load', timeout: 8000 });
  } catch (e) {
    console.log("Goto error:", e.message);
  }
  
  await browser.close();
})();
