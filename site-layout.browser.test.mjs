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
      assert.equal(await page.locator('.studio-category').count(),3);
      assert.equal(await page.locator('#replay-tools .tool-card').count(),1);
      assert.ok(await page.locator('#replay-tool a[href="/replays/"]').isVisible());
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


const sitePages=['/','/field/','/replays/','/tools/','/servers/','/servers/customs/','/tech/','/clipper.html','/tiktok-downloader.html','/leaderboard/','/404.html'];
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
        await query.fill('Replay Studio');
        assert.ok(await dialog.locator('.site-command-item[href="/replays/"]').count()>0,'Replay Studio must be discoverable');
        await query.fill('Field Lab');
        assert.ok(await dialog.locator('.site-command-item[href="/field/"]').count()>0,'Field Lab must be discoverable');
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

test('wiki navigation stays consistent across article, finder and rules pages',async()=>{
 const {context,page}=await open('/',390,850);
 try{
  const nav=()=>page.locator('.n29-nav-links a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
  const baseline=await nav();
  for(const path of ['/styles/','/styles/nagi/','/flows/','/flows/trap/','/servers/','/servers/customs/','/tech/']){
   await page.goto(base+path,{waitUntil:'load'});assert.deepEqual(await nav(),baseline,path);
   const account=await rect(page,'.n29-account-nav'),search=await rect(page,'.n29-nav-search'),links=await rect(page,'.n29-nav-links');
   assert.ok(Math.abs(account.y-search.y)<5,path+' account shares header row');assert.ok(links.y>=search.bottom-2,path+' nav row overlap');await assertNoOverflow(page,path);
  }
 }finally{await context.close();}
});
test('mobile wiki section navigation, filter history and full search are usable',async()=>{
 const {context,page}=await open('/styles/',360,780);
 try{
  const menu=page.locator('.kb-mobile-nav');assert.ok(await menu.isVisible());await menu.locator('summary').click();assert.ok(await menu.getByRole('link',{name:'Cosmetics'}).isVisible());await menu.locator('summary').click();
  await page.locator('#kb-filter').fill('nel nagi');assert.equal(await page.locator('.kb-tile:visible').count(),1);assert.ok(page.url().includes('q='));
  await page.locator('.kb-tile:visible').click();await page.waitForURL('**/styles/nagi/');await page.goBack();
  assert.equal(await page.locator('#kb-filter').inputValue(),'nel nagi');assert.equal(await page.locator('.kb-tile:visible').count(),1);
  await page.locator('#kb-filter').fill('does not exist');assert.ok(await page.locator('.kb-filter-empty').isVisible());await page.locator('.kb-clear-filter').click();assert.equal(await page.locator('.kb-tile:visible').count(),45);
  await page.locator('[data-command-open]').click();const query=page.locator('.site-command-search');await query.fill('progression');await page.waitForFunction(()=>!!document.querySelector('.site-command-item[href="/progression/"]'));await query.press('Enter');await page.waitForURL('**/progression/');
 }finally{await context.close();}
});
test('wiki icons have a static first paint without JavaScript or sprite downloads',async()=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:850}});
 try{const page=await context.newPage();await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base+'/styles/');assert.equal(await page.locator('.kb-icon-label').count(),45);assert.ok(await page.locator('a[href="/styles/gagamaru/"] .kb-icon-label').innerText());}finally{await context.close();}
});

test('announcement archive filters, codes stay unverified and style records load on demand',async()=>{
 const {context,page}=await open('/updates/',390,850);
 try{
  await page.locator('.announcement-card').first().waitFor();
  assert.equal(await page.locator('.announcement-card').count(),20);
  assert.match(await page.locator('.announcement-card').nth(0).innerText(),/BL:R OG/);
  assert.match(await page.locator('.announcement-card').nth(1).innerText(),/Otoya rework/);
  await page.locator('input[placeholder="Search announcements…"]').fill('Otoya');
  assert.ok(await page.locator('.announcement-card').count()>0);
  assert.match(await page.locator('.announcement-card').first().innerText(),/Otoya/);
  assert.ok(await page.locator('.announcement-card').filter({hasText:'Otoya rework'}).count()>0);
  await assertNoOverflow(page,'Updates archive');
  await page.goto(base+'/styles/otoya/');await page.locator('#announced-abilities').waitFor();assert.match(await page.locator('#announced-abilities').innerText(),/Ninjaristic Presence/);await assertNoOverflow(page,'Otoya abilities');
  await page.goto(base+'/flows/ice/');await page.locator('.announcement-card').first().waitFor();assert.match(await page.locator('.announcement-card').first().innerText(),/Ice rework/i);
  await page.goto(base+'/codes/');await page.locator('.code-entry').first().waitFor();assert.match(await page.locator('.code-entry').first().innerText(),/unverified/i);await assertNoOverflow(page,'Codes');
 }finally{await context.close();}
});

test('wiki private editor requires authorization and loads tested entries without exposing a key',async()=>{
 const {context,page}=await open('/wiki/admin/',390,850);
 try{
 await page.route('https://glutony.scp343hey.workers.dev/api/wiki/**',async r=>{const path=new URL(r.request().url()).pathname;const auth=r.request().headers()['authorization'];await r.fulfill({status:auth==='Bearer test-key'?200:403,contentType:'application/json',body:JSON.stringify(auth==='Bearer test-key'?(path.endsWith('/session')?{authorized:true}:{entries:[]}):{error:'Not authorized'})});});
 assert.ok(await page.locator('#workspace').isHidden());
 await page.locator('#key').fill('test-key');await page.getByRole('button',{name:'Unlock',exact:true}).click();await page.locator('#workspace').waitFor();await page.locator('#style').selectOption('otoya');await page.getByRole('button',{name:/Ninjaristic Presence/}).waitFor();await page.getByRole('button',{name:/Ninjaristic Presence/}).click();assert.equal(await page.locator('[name="name"]').inputValue(),'Ninjaristic Presence');assert.equal(await page.locator('[name="cooldown"]').inputValue(),'');assert.equal(await page.locator('[name="testedOn"]').inputValue(),'');await assertNoOverflow(page,'Wiki editor');assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('test-key')),false);
 }finally{await context.close();}
});

test('public tested abilities render all records and refresh after edits',async()=>{
 const {context,page}=await open('/styles/otoya/',390,850);
 try{
 let records=[{name:'Ninjaristic Presence',kit:'Base',testedOn:'2026-11-24',cooldown:45,range:0}];
 await page.route('https://glutony.scp343hey.workers.dev/api/wiki/styles/otoya**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({entries:records})}));
 await page.reload();
 await page.locator('#tested-abilities .tested-card').first().waitFor();
 assert.equal(await page.locator('#tested-abilities .tested-card').count(),1);
 records=[...records,{name:'Nin.',kit:'Base',testedOn:'2026-11-24',cooldown:40,range:185},{name:'Center of the World',kit:'Awakening',testedOn:'2026-11-24',cooldown:70,range:290},{name:'Test chemistry',kit:'Chemical reaction',testedOn:'2026-11-24',cooldown:80}];
 await page.getByRole('button',{name:'Refresh values',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('#tested-abilities .tested-card').length===4);
 const section=page.locator('#tested-abilities');
 const baseTab=section.getByRole('tab',{name:/^Base/}),awkTab=section.getByRole('tab',{name:/^Awk/}),chemTab=section.getByRole('tab',{name:/^Chem/});
 const visible=section.locator('.tested-card:visible');
 assert.equal(await baseTab.getAttribute('aria-selected'),'true');
 assert.equal(await visible.count(),2);
 assert.equal(await section.locator('[role=tabpanel][data-kit="base"] .tested-card').count(),2);
 assert.equal(await section.locator('[role=tabpanel][data-kit="awakening"] .tested-card').count(),1);
 assert.equal(await section.locator('[role=tabpanel][data-kit="chemical"] .tested-card').count(),1);
 const nonoverlap=async()=>{const cards=await visible.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));assert.ok(cards.every(r=>r.width>0&&r.height>0));for(let i=1;i<cards.length;i++)assert.ok(cards[i].top>=cards[i-1].bottom-0.5,'Visible cards must not overlap');};
 await nonoverlap();await assertNoOverflow(page,'Mobile tested cards');
 await awkTab.click();assert.equal(await visible.count(),1);assert.match(await visible.innerText(),/Center of the World/);
 await chemTab.click();assert.equal(await visible.count(),1);assert.match(await visible.innerText(),/Test chemistry/);
 await section.getByRole('button',{name:'Refresh values',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#tested-tab-chemical')?.getAttribute('aria-selected')==='true'&&!document.querySelector('#tested-abilities button.kb-clear-filter')?.disabled);
 assert.match(await visible.innerText(),/Test chemistry/);
 await chemTab.focus();await chemTab.press('Home');assert.equal(await baseTab.getAttribute('aria-selected'),'true');assert.equal(await visible.count(),2);
 await page.setViewportSize({width:1440,height:1000});await nonoverlap();
 await assertNoOverflow(page,'Tested ability cards');
 }finally{await context.close();}
});

for(const width of [1440,390]){
  test('Replay Studio local demo and camera controls at '+width+'px',async()=>{
    const {context,page}=await open('/replays/',width,900);
    try{
      await assertNoOverflow(page,'Replay Studio '+width);
      assert.ok(await page.locator('details.fairplay').filter({hasText:'Fair Play & Responsible Use'}).isVisible());
      assert.ok((await page.locator('#match option').first().textContent()).includes('Synthetic demo'));
      assert.equal(await page.locator('#mode option').count(),7);
      assert.ok(await page.locator('#canvas').isVisible());
      assert.deepEqual(await page.evaluate(()=>[BLRFieldGeometry.version,BLRFieldGeometry.markings.rects.length,BLRFieldGeometry.markings.spots.length,BLRFieldGeometry.markings.curves.length]),[3,19,3,7]);
      assert.ok(Number(await page.locator('#seek').getAttribute('max'))>0);
      for(const mode of ['orbit','top','pov','free','chase','ballorbit','player']){
        await page.locator('#mode').selectOption(mode);
        await page.waitForTimeout(50);
      }
      await page.locator('#play').click();
      await page.waitForTimeout(300);
      assert.ok(Number(await page.locator('#seek').inputValue())>0);
      await page.locator('#play').click();
      const blocked=await page.evaluate(async()=>{try{await fetch('https://example.invalid/replay-privacy-check');return false}catch{return true}});
      assert.ok(blocked,'Replay page must block unapproved cross-origin network connections');
    }finally{await context.close();}
  });
}

test('Replay imports reject malformed data and isolate label fingerprints',async()=>{
  const {context,page}=await open('/replays/',1440,900);
  try{
    const result=await page.evaluate(async()=>{
      const base={t:0,players:[{id:1,team:'Home',cf:[0,10,0]}]};
      const input=frames=>[new File([JSON.stringify(frames)],'chunk_000001.json')];
      const first=await parseReplayFiles(input([base]));
      const other=await parseReplayFiles(input([{...base,players:[{id:1,team:'Home',cf:[5,10,0]}]}]));
      let rejected=false;try{await parseReplayFiles(input([{...base,players:[null]}]))}catch{rejected=true}
      return {different:first[0].fp!==other[0].fp,rejected,frames:first[0].chunks.length,matchCount:first.length};
    });
    assert.deepEqual(result,{different:true,rejected:true,frames:1,matchCount:1});
  }finally{await context.close();}
});
test('Field Lab shares measured geometry and preserves game-meter ability modes',async()=>{
  const {context,page}=await open('/field/',1440,900);
  try{
    assert.equal(await page.locator('#calibration').inputValue(),'studs');
    assert.ok((await page.locator('#pitch-size').textContent()).includes('545.04 × 408.31 studs'));
    assert.equal(await page.locator('#white-line-parts rect').count(),19);
    assert.equal(await page.locator('#white-line-parts ellipse').count(),3);
    assert.equal(await page.locator('#white-line-unions polyline').count(),7);
    assert.equal(await page.evaluate(()=>BLRFieldGeometry.version),3);
    await page.locator('#field-settings > summary').click();
    await page.locator('#penalty-toggle').check();
    assert.ok(await page.locator('#penalty-layer').isVisible());
    await page.locator('#penalty-toggle').uncheck();
    assert.ok(!(await page.locator('#penalty-layer').isVisible()));
    await page.locator('[data-mode="shot"]').click();
    assert.equal(await page.locator('#calibration').inputValue(),'405');
    assert.ok((await page.locator('#pitch-size').textContent()).includes('540 × 405 m'));
  }finally{await context.close();}
});

test('Replay goal markers detect scoring changes and seek to highlights',async()=>{
  const {context,page}=await open('/replays/',1440,900);
  try{
    await page.locator('#eventList button').first().waitFor({state:'visible'});
    assert.equal(await page.locator('#eventList button').count(),1);
    assert.match(await page.locator('#eventList button').first().innerText(),/0:18.0.*Home goal.*1–0/s);
    await page.locator('#eventList button').first().click();
    assert.equal(Number(await page.locator('#seek').inputValue()),15);
    await page.locator('#preRoll').uncheck();
    await page.locator('#eventTrack button').first().click();
    assert.equal(Number(await page.locator('#seek').inputValue()),18);
    assert.equal(await page.locator('#score').textContent(),'1 : 0');
    const events=await page.evaluate(()=>{
      const rows=[[0,'2','1'],[1,'2','1'],[2,'2','2'],[3,'0','0'],[4,'0','0'],[5,'–','–'],[6,'1','0'],[7,'1','3']];
      return detectReplayGoals(rows.map(([t,home,away])=>({t,scoreboard:{home,away,timer:'4:00'}})));
    });
    assert.deepEqual(events.map(e=>[e.t,e.team,e.count,e.exact]),[[2,'Away',1,true],[6,'Home',1,false],[7,'Away',3,false]]);
  }finally{await context.close();}
});


test('Nagi technical abilities stack without overlap on mobile and desktop',async()=>{
 for(const width of [390,1440]){
  const {context,page}=await open('/styles/nagi/',width,900);
  try{
   const section=page.locator('#technical-abilities');
   await section.locator('.ta-card').first().waitFor();
   async function check(count){
    const cards=section.locator('.ta-card:visible');
    assert.equal(await cards.count(),count);
    const boxes=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width};}));
    for(let i=0;i<boxes.length;i++){assert.ok(boxes[i].width>0);if(i)assert.ok(boxes[i].top>=boxes[i-1].bottom-1,'ability cards overlap');}
   }
   await check(7);
   await section.getByLabel('Mastery level').selectOption('Mastery III');await check(1);
   const heel=section.locator('.ta-card:visible');assert.match(await heel.innerText(),/Direct Heel Lift/);
   await heel.getByText('Timing, mechanics & verification',{exact:true}).click();assert.ok(await heel.locator('dt').getByText('Scheduled cleanup',{exact:true}).isVisible());
   await section.getByLabel('Distance units').selectOption('game');assert.match(await heel.innerText(),/game m/);
   await section.getByLabel('Mastery level').selectOption('all');await check(7);
   await section.getByRole('button',{name:'Awk (4)',exact:true}).click();await check(4);
   await section.getByRole('button',{name:'Chem (0)',exact:true}).click();await check(0);
   await section.getByRole('button',{name:'Base (7)',exact:true}).click();await check(7);
   await assertNoOverflow(page,'Nagi technical abilities');
  }finally{await context.close();}
 }
});

test('Nagi mathematical previews react to input and retain exact steering coordinates',async()=>{
 const {context,page}=await open('/styles/nagi/',390,900);
 try{
  const section=page.locator('#technical-abilities');
  await section.locator('.ta-card').first().waitFor();
  const trap=section.locator('.ta-card').filter({has:page.getByRole('heading',{name:'Trap Shot',exact:true})});
  await trap.getByText('3D shot simulation',{exact:true}).click();
  await trap.getByText('Simulation settings',{exact:true}).click();
  const angle=trap.getByLabel('Camera elevation (°)',{exact:true});
  await angle.fill('0');
  const stats=trap.locator('.flight3d .fstat').filter({hasText:'First landing:'});
  const first=await stats.innerText();
  assert.match(first,/First landing:.*studs/);
  await angle.fill('30');
  assert.notEqual(await angle.inputValue(),'0');
  assert.notEqual(await stats.innerText(),first);
  assert.ok(await trap.locator('.flight3d canvas').isVisible());
  const turn=section.locator('.ta-card').filter({has:page.getByRole('heading',{name:'Zero Reset Turn',exact:true})});
  await turn.getByText('Mathematical steering path',{exact:true}).click();
  const target=turn.getByLabel('Steering target u');
  await target.fill('0.5');
  assert.match(await turn.locator('.am-metrics').innerText(),/15 studs/);
  assert.match(await turn.locator('.am-metrics').innerText(),/-25 studs/);
  await assertNoOverflow(page,'Nagi math previews');
 }finally{await context.close();}
});

test('Nagi playback and conditional phase details are available',async()=>{
 const {context,page}=await open('/styles/nagi/',390,900);
 try{
  const section=page.locator('#technical-abilities');
  await section.locator('.ta-card').first().waitFor();
  assert.equal(await section.locator('.ta-behavior').count(),7);
  const turn=section.locator('.ta-card').filter({has:page.getByRole('heading',{name:'Zero Reset Turn',exact:true})});
  await turn.getByText('Mathematical steering path',{exact:true}).click();
  await turn.locator('.am-equations math').first().waitFor({state:'visible'});
  assert.ok(await turn.locator('.am-equations math').count()>=3);
  await turn.getByRole('button',{name:'Play or pause preview',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Ability timeline progress"]')?.value)>0);
  await turn.getByRole('button',{name:'Restart preview',exact:true}).click();
  assert.equal(Number(await turn.getByLabel('Ability timeline progress').inputValue()),0);
  await turn.getByText('Activation conditions & movement phases',{exact:true}).click();
  assert.equal(await turn.locator('.ta-gates span').count(),4);
  assert.equal(await turn.locator('.ta-phases li').count(),4);
  await assertNoOverflow(page,'Nagi animation controls');
 }finally{await context.close();}
});
