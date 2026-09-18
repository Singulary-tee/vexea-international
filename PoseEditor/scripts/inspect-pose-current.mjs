import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const logs=[]; page.on('console',m=>logs.push({type:m.type(),text:m.text()})); page.on('pageerror',e=>logs.push({type:'pageerror',text:e.stack||e.message}));
await page.goto('http://127.0.0.1:3000/pose-editor.html?item=rifle&view=third&backend=webgl&clip=rifle_idle',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__poseEditor?.getState?.(),null,{timeout:30000});
await page.waitForTimeout(300);
console.log(JSON.stringify({state:await page.evaluate(()=>window.__poseEditor.getState()), projection:await page.evaluate(()=>window.__poseEditor.getProjectionDiagnostics()), body:await page.evaluate(()=>window.__poseEditor.getBodyMetrics()), logs},null,2));
await browser.close();
