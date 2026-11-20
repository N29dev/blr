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
  test('Wiki homepage fits '+width+'px',async()=>{const {context,page}=await open('/',width,900);try{await assertNoOverflow(page,'Wiki '+width);assert.equal(await page.locator('.kb-preview .kb-tile').count(),12);assert.ok(await page.locator('#kb-search').isVisible());assert.equal(await page.locator('#rbx-avatar').count(),0);if(width>670)assert.ok(await page.locator('.kb-sidebar').isVisible());else assert.ok(!await page.locator('.kb-sidebar').isVisible());}finally{await context.close();}});
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
      for(const id of ['compress-drop','compress-quality','tiktok-url','tiktok-check']){
        assert.ok(await page.locator('#'+id).isVisible(),id+' is hidden at '+width);
      }
      assert.equal(await page.locator('#compress-video').getAttribute('type'),'file');
      assert.ok((await page.locator('#patch-tool').innerText()).includes('Temporarily unavailable'));
      assert.equal(await page.locator('#patch-tool input, #patch-tool select, #patch-tool button').count(),0);
      assert.ok(await page.locator('#patch-tool a[href="https://compressbase.com/upload-method"]').isVisible());
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


const sitePages=['/','/tools/','/servers/','/servers/customs/','/tech/','/clipper.html','/tiktok-downloader.html','/leaderboard/','/404.html'];
for(const route of sitePages){
  for(const width of [390,820]){
    test('Shared Quick Jump is consistent on '+route+' at '+width+'px',async()=>{
      const {context,page}=await open(route,width,850);
      try{
        const button=page.locator('[data-command-open]').first();
        assert.ok(await button.isVisible(),route+' missing Search trigger');
        assert.equal(await button.getAttribute('aria-label'),'Open Quick Jump search');
        assert.equal((await button.innerText()).includes('Quick jump'),true,route+' inconsistent search button');
        const buttonBox=await button.boundingBox();
        assert.ok(buttonBox&&buttonBox.x>=-1&&buttonBox.x+buttonBox.width<=width+1,route+' search button escapes viewport');
        await button.click();
        const dialog=page.locator('#n29-quick-jump');
        assert.ok(await dialog.isVisible(),route+' search modal failed');
        const box=await dialog.boundingBox();
        assert.ok(box&&box.x>=0&&box.x+box.width<=width+1,route+' search modal wider than screen');
        const computed=await dialog.evaluate(el=>({
          font:getComputedStyle(el).fontFamily,
          bg:getComputedStyle(el).backgroundColor,
          radius:getComputedStyle(el).borderRadius
        }));
        assert.ok(computed.font.toLowerCase().includes('dm sans'),'Different modal typography on '+route);
        assert.ok(computed.radius!=='0px','Different modal border radius on '+route);
        const query=dialog.locator('.site-command-search');
        assert.ok(await query.isVisible(),route+' search input hidden');
        await query.fill('style directory');
        assert.ok(await dialog.locator('.site-command-item').count()>0,'Style search yields no results');
        assert.ok((await dialog.locator('.site-command-item').first().innerText()).toLowerCase().includes('style'));
        await query.press('Escape');
        assert.ok(!await dialog.isVisible(),'Escape must close modal on '+route);
      }finally{await context.close();}
    });
  }
}

for(const route of sitePages){
  test('Mobile shell fits screen on '+route,async()=>{
    const {context,page}=await open(route,360,780);
    try{
      await assertNoOverflow(page,'Mobile '+route);
      const nav=page.locator('.n29-nav').first();
      assert.ok(await nav.isVisible(),route+' missing shared navigation');
      const navRect=await nav.boundingBox();
      assert.ok(navRect&&navRect.width<=362,route+' navigation spills horizontally');
      const links=page.locator('.n29-nav-links').first();
      const styles=await links.evaluate(el=>({
        overflow:getComputedStyle(el).overflowX,
        scrollWidth:el.scrollWidth,clientWidth:el.clientWidth
      }));
      assert.ok(['auto','scroll'].includes(styles.overflow),route+' navigation links need touch scrolling');
    }finally{await context.close();}
  });
}

test('Creator Studio skip link is hidden until keyboard focus',async()=>{
  const {context,page}=await open('/tools/',390,800);
  try{
    const skip=page.locator('a.skip-link');
    assert.equal(await skip.count(),1,'missing accessible skip link');
    const rest=await skip.evaluate(el=>({opacity:getComputedStyle(el).opacity,top:el.getBoundingClientRect().top}));
    assert.ok(rest.opacity==='0'||rest.top<0,'Skip link shown at rest');
    await skip.focus();
    const focused=await skip.evaluate(el=>({opacity:getComputedStyle(el).opacity,top:el.getBoundingClientRect().top}));
    assert.equal(focused.opacity,'1','Skip link should appear on focus');
    assert.ok(focused.top>=0,'Skip link should enter visible viewport on focus');
    await skip.press('Enter');
    assert.ok(page.url().endsWith('#main'),'Skip link should move to main content');
  }finally{await context.close();}
});

for(const width of [1440,820,390,360]){
  test('Creator Studio card edges and equal columns at '+width+'px',async()=>{
    const {context,page}=await open('/tools/',width,900);
    try{
      const grid=await rect(page,'#video-tools .creator-tools-grid');
      const compressor=await rect(page,'#compress-tool');
      const patch=await rect(page,'#patch-tool');
      const clipper=await rect(page,'#clipper-tool');
      const tiktok=await rect(page,'#tiktok-tools .creator-tools-grid');
      const analyze=await rect(page,'#analyze-tool');
      const download=await rect(page,'#tiktok-download-tool');
      assert.ok(Math.abs(compressor.x-grid.x)<=3,'Compressor not aligned with video grid');
      assert.ok(Math.abs(compressor.right-grid.right)<=3,'Compressor exceeds video grid right edge');
      if(width>=820){
        assert.ok(Math.abs(patch.y-clipper.y)<=3,'Patch and clip cards not in same row');
        assert.ok(Math.abs(patch.height-clipper.height)<=3,'Patch and clip cards not same row height');
        assert.ok(Math.abs(analyze.y-download.y)<=3,'TikTok tool cards not aligned');
        assert.ok(Math.abs(analyze.height-download.height)<=3,'TikTok tools differ in height');
      }else{
        assert.ok(clipper.y>patch.y,'Mobile video tools should stack');
        assert.ok(download.y>analyze.y,'Mobile TikTok tools should stack');
      }
      assert.ok(Math.abs(analyze.x-tiktok.x)<=3,'TikTok grid misaligned');
      assert.ok(Math.abs(download.right-tiktok.right)<=3,'TikTok right edge misaligned');
      await assertNoOverflow(page,'Creator tools '+width);
    }finally{await context.close();}
  });
}

for(const route of ['/styles/','/flows/','/styles/nagi/','/flows/trap/','/search/?q=nagi']){test('Wiki article/directory fits '+route,async()=>{const {context,page}=await open(route,390,850);try{await assertNoOverflow(page,route);assert.ok(await page.locator('h1').isVisible());if(route==='/styles/'){assert.equal(await page.locator('.kb-tile').count(),45);await page.locator('#kb-filter').fill('nagi');assert.equal(await page.locator('.kb-tile:visible').count(),3);}if(route==='/flows/')assert.equal(await page.locator('.kb-tile').count(),33);if(route==='/styles/nagi/')assert.ok(await page.locator('.wiki-progress').isVisible());if(route.startsWith('/search'))assert.ok(await page.locator('#kb-search-results a').count()>0);}finally{await context.close();}});}

test('procedural wiki tiles require no screenshot downloads and support reduced motion',async()=>{
  const {context,page}=await open('/styles/',390,850);
  try{
    await page.locator('.kb-icon-label').first().waitFor();
    assert.equal(await page.locator('.kb-icon-label').count(),45);
    assert.equal(await page.locator('.kb-icon[data-master="true"]').count(),3);
    assert.equal(await page.locator('.kb-icon[data-master="true"]').first().evaluate(e=>getComputedStyle(e,'::before').animationName),'none');
    assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/assets\/wiki\/.*\.webp/.test(r.name)).length),0);
    assert.ok(await page.locator('a[href="/styles/easter-kaiser/"] .kb-icon-label').innerText());
    await page.goto(base+'/flows/',{waitUntil:'load'});
    assert.equal(await page.locator('.kb-icon-label').count(),33);
    assert.equal(await page.locator('a[href="/flows/trap/"] .kb-icon').getAttribute('data-palette'),'gold');
    assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/assets\/wiki\/.*\.webp/.test(r.name)).length),0);
  }finally{await context.close();}
});
test('master borders animate only while visible',async()=>{
  const {context,page}=await open('/styles/lavinho/',390,850);
  try{
    await page.emulateMedia({reducedMotion:'no-preference'});
    const icon=page.locator('.kb-icon[data-master="true"]');
    await icon.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.kb-icon[data-master="true"]')?.classList.contains('kb-icon-visible'));
    assert.equal(await icon.evaluate(e=>getComputedStyle(e,'::before').animationName),'kb-border-orbit');
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    await page.waitForFunction(()=>!document.querySelector('.kb-icon[data-master="true"]')?.classList.contains('kb-icon-visible'));
    assert.equal(await icon.evaluate(e=>getComputedStyle(e,'::before').animationName),'none');
  }finally{await context.close();}
});

for(const width of [360,820,1440]){
  test('all wiki icon labels fit without broken words at '+width+'px',async()=>{
    const {context,page}=await open('/styles/',width,900);
    try{
      for(const route of ['/styles/','/flows/']){
        if(route!=='/styles/')await page.goto(base+route,{waitUntil:'load'});
        await page.locator('.kb-icon-line').first().waitFor();
        const metrics=await page.locator('.kb-icon').evaluateAll(icons=>icons.flatMap(icon=>{
          const bounds=icon.getBoundingClientRect();
          return [...icon.querySelectorAll('.kb-icon-line')].map(line=>{
            const range=document.createRange();range.selectNodeContents(line);
            const r=range.getBoundingClientRect();
            return {text:line.textContent,width:r.width,tile:bounds.width,inside:r.left>=bounds.left+2&&r.right<=bounds.right-2,lines:range.getClientRects().length};
          });
        }));
        assert.ok(metrics.length>0);
        for(const m of metrics){assert.ok(m.inside,m.text+' escapes icon '+JSON.stringify(m));assert.equal(m.lines,1,m.text+' wrapped');assert.ok(m.width<=m.tile*.83,m.text+' exceeds safe width');}
        if(route==='/styles/'){
          const gagamaru=page.locator('a[href="/styles/gagamaru/"] .kb-icon-line');
          assert.equal(await gagamaru.count(),1);
          assert.equal(await gagamaru.innerText(),'Gagamaru');
          assert.equal(await page.locator('a[href="/styles/nagi/"] .kb-icon-line').innerText(),'NEL Nagi');
          assert.deepEqual(await page.locator('a[href="/styles/chigiri/"] .kb-icon-line').allTextContents(),['NEL','Chigiri']);
        }
        assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/assets\/wiki\/.*\.webp/.test(r.name)).length),0);
      }
    }finally{await context.close();}
  });
}
