/**
 * Rendered layout QA for the homepage and Creator Studio.
 * Run after installing Playwright Chromium:
 *   npm install --no-save playwright@1.56.1
 *   npx playwright install chromium
 *   node --test site-layout.browser.test.mjs
 *
 * Uses a local static HTTP server and blocks external resources so tests
 * don't depend on Roblox, TikTok, Google Fonts or CompressBase being online.
 */
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, join, sep, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(fileURLToPath(new URL('.',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif'};
let server, browser, base;

before(async()=>{
  server=createServer(async(req,res)=>{
    let name;
    try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
    catch{res.writeHead(400).end('Bad path');return;}
    const path=resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end('Forbidden');return;}
    try{
      if(!(await stat(path)).isFile())throw Error('not a file');
      const body=await readFile(path);
      res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream','cache-control':'no-store'});
      res.end(body);
    }catch{res.writeHead(404).end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
});
after(async()=>{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
});

async function open(path,width,height){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',deviceScaleFactor:1});
  const page=await context.newPage();
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.goto(base+path,{waitUntil:'load'});
  await page.locator('body').waitFor({state:'visible'});
  await page.evaluate(()=>document.fonts.ready);
  return {context,page};
}
async function rect(page,selector){
  return await page.locator(selector).first().evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
  });
}
async function assertNoOverflow(page,label){
  const metrics=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth,
    body:document.body.scrollWidth,
    viewport:innerWidth,
    computedBodyFont:getComputedStyle(document.body).fontFamily
  }));
  assert.ok(metrics.document<=metrics.viewport+4,label+' document overflow '+JSON.stringify(metrics));
  assert.ok(metrics.body<=metrics.viewport+4,label+' body overflow '+JSON.stringify(metrics));
}

for(const width of [1440,820,390,360]){
  test('Home Play + Profile layout at '+width+'px',async()=>{
    const {context,page}=await open('/',width,900);
    try{
      await assertNoOverflow(page,'Home '+width);
      assert.equal(await page.locator('#play .site-route-card').count(),4);
      assert.equal(await page.locator('#stats .stat').count(),9);
      assert.ok(await page.locator('#play').isVisible());
      assert.ok(await page.locator('#stats').isVisible());
      const p=await rect(page,'#stats .profile-card');
      const avatar=await rect(page,'#stats .avatar-wrap');
      const stats=await rect(page,'#stats .stats-grid');
      assert.ok(avatar.x>=p.x-3&&avatar.right<=p.right+3,'Profile avatar escapes card at '+width);
      assert.ok(stats.x>=p.x-3&&stats.right<=p.right+3,'Statistics escape card at '+width);
      const first=await rect(page,'#play .site-route-card:nth-child(1)');
      const second=await rect(page,'#play .site-route-card:nth-child(2)');
      const third=await rect(page,'#play .site-route-card:nth-child(3)');
      if(width>=820){
        assert.ok(Math.abs(first.x-second.x)>50,'Desktop Play cards should be two columns');
        assert.ok(Math.abs(first.x-third.x)<4,'Third card should start second row');
      }else{
        assert.ok(Math.abs(first.x-second.x)<4,'Mobile Play cards should stack');
        assert.ok(second.y>first.y,'Mobile Play cards overlap');
      }
    }finally{await context.close();}
  });
}

for(const width of [1440,820,390,360]){
  test('Creator Studio tool layout at '+width+'px',async()=>{
    const {context,page}=await open('/tools/',width,900);
    try{
      await assertNoOverflow(page,'Creator Studio '+width);
      assert.equal(await page.locator('body').getAttribute('data-page'),'tools');
      assert.equal(await page.locator('.studio-category').count(),2);
      assert.equal(await page.locator('#video-tools .tool-card').count(),3);
      assert.equal(await page.locator('#tiktok-tools .tool-card').count(),2);
      assert.deepEqual(await page.locator('#video-tools .tool-card').evaluateAll(els=>els.map(el=>el.id)),
                       ['compress-tool','patch-tool','clipper-tool']);
      assert.deepEqual(await page.locator('#tiktok-tools .tool-card').evaluateAll(els=>els.map(el=>el.id)),
                       ['analyze-tool','tiktok-download-tool']);
      for(const id of ['compress-drop','compress-quality','patch-video','posting-device','patch-button','tiktok-url','tiktok-check']){
        assert.ok(await page.locator('#'+id).isVisible(),id+' is hidden at '+width);
      }
      assert.equal(await page.locator('#compress-video').getAttribute('type'),'file');
      const video=await rect(page,'#video-tools');
      const tiktok=await rect(page,'#tiktok-tools');
      assert.ok(tiktok.y>video.y,'TikTok group should appear after video tools');
      for(const id of ['compress-tool','patch-tool','clipper-tool','analyze-tool','tiktok-download-tool']){
        const r=await rect(page,'#'+id);
        assert.ok(r.width>170,'Tool card too narrow '+id+' at '+width);
        assert.ok(r.x>=-3&&r.right<=width+3,'Tool card overflow '+id+' at '+width);
      }
    }finally{await context.close();}
  });
}
