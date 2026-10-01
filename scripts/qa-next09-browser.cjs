const {chromium}=require('C:/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/trpc/**',route=>route.fulfill({json:[{result:{data:{json:{telegramUser:{telegramId:'100001',firstName:'Synthetic',isAdmin:false},profile:null}}}}]}));
 let fail=false;
 await page.route('**/api/platform-connection/prove',route=>{
  assert.deepEqual(route.request().postDataJSON(),{token:'/link '+'a'.repeat(64)});
  return route.fulfill(fail?{status:503,json:{error:'خطای آزمایشی اتصال'}}:{json:{confirmation:'f'.repeat(64),status:'site_confirmation_required'}});
 });
 await page.goto('http://127.0.0.1:8801/platform-connection',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'اتصال به حساب سایت'}).waitFor();
 await page.getByLabel('فرمان اتصال سایت').fill('/link '+'a'.repeat(64));await page.getByRole('button',{name:'تأیید سمت تلگرام'}).click();
 await page.getByLabel('کد تأیید',{exact:true}).waitFor();assert.equal(await page.getByLabel('کد تأیید',{exact:true}).inputValue(),'f'.repeat(64));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'docs/next09/ui-mobile.png',fullPage:true});
 fail=true;await page.getByLabel('فرمان اتصال سایت').fill('/link '+'a'.repeat(64));await page.getByRole('button',{name:'تأیید سمت تلگرام'}).click();await page.getByRole('alert').filter({hasText:'خطای آزمایشی اتصال'}).waitFor();
 assert.deepEqual(errors,[]);fs.writeFileSync('docs/next09/browser-results.json',JSON.stringify({fixtureOnly:true,checks:['verified-session fixture gate','no contact profile required for connection','proof form','returned confirmation','failure visible','mobile no overflow'],pageErrors:errors},null,2));
 await browser.close();console.log('Miniapp NEXT09 fixture UI passed');
})().catch(e=>{console.error(e);process.exit(1);});
