import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)));
const read=path=>readFileSync(join(root,path),'utf8');
const pages=[
  'index.html','servers/index.html','servers/customs/index.html',
  'tech/index.html','tech/admin/index.html','tools/index.html',
  'clipper.html','tiktok-downloader.html'
];
const mainPages=pages.filter(x=>x!=='tech/admin/index.html');
const shared=read('site-experience.js');

test('all major BLR pages use the portfolio-inspired shared navbar and stylesheet',()=>{
  for(const page of pages){
    const source=read(page);
    assert.ok(source.includes('class="n29-nav"'),page+' lacks shared nav');
    assert.ok(source.includes('/site-unify.css?v=2'),page+' lacks theme');
    assert.ok(source.includes('/site-responsive.css?v=1'),page+' missing shared mobile/search stylesheet');
    assert.ok(source.includes('/site-experience.js?v=4'),page+' lacks searchable quick nav');
    assert.ok(source.includes('family=Space+Grotesk'),page+' lacks portfolio headline font');
    assert.ok(source.includes('family=DM+Sans'),page+' lacks portfolio body font');
    assert.ok(source.includes('href="/tools/"'),page+' creator route');
    assert.ok(source.includes('href="https://n29.kz/"'),page+' portfolio link');
    assert.ok(source.includes('href="/servers/"'),page+' server finder');
    assert.ok(source.includes('href="/tech/"'),page+' tech directory');
    const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(ids).size,ids.length,page+' duplicate DOM ID');
  }
});

test('public feature pages retain one Explore BLR cross-link directory',()=>{
  for(const page of mainPages.filter(x=>x!=='index.html')){
    const text=read(page);
    assert.equal((text.match(/data-site-connect/g)||[]).length,1,page);
  }
  assert.ok(shared.includes('initSiteConnections()'));
});

test('creator widgets moved intact to their own page',()=>{
  const home=read('index.html'),studio=read('tools/index.html');
  assert.ok(home.includes('id="tools"'),'old /#tools anchors must still work');
  assert.ok(home.includes('href="/tools/"'));
  assert.ok(!home.includes('id="patch-video"'));
  assert.ok(!home.includes('id="compress-video"'));
  assert.ok(!home.includes('id="tiktok-url"'));
  for(const id of ['patch-video','patch-button','patch-download','posting-device',
                    'tiktok-url','tiktok-check','tiktok-results',
                    'compress-video','compress-button','compress-progress','compress-download']){
    assert.ok(studio.includes('id="'+id+'"'),id+' missing');
  }
  for(const path of ['/tools/tiktok-info.js','/tools/patch.mjs','/tools/compress.mjs'])
    assert.ok(studio.includes('src="'+path+'?v=1"'),path);
  assert.ok(read('tools/compress.mjs').includes("new URL('/ffmpeg-worker.js', window.location.origin)"));
  assert.ok(existsSync(join(root,'ffmpeg-worker.js')));
  assert.ok(studio.includes('href="/tiktok-downloader.html"'));
  assert.ok(studio.includes('href="/clipper.html"'));
});

test('skip link is shared and search UI is the same on each page',()=>{
  const source=read('site-experience.js');
  assert.ok(source.includes('Open Quick Jump search'));
  assert.ok(source.includes("dialog.id='n29-quick-jump'"));
  assert.ok(source.includes('n29-search-label'));
  for(const page of ['index.html','tools/index.html','servers/index.html','servers/customs/index.html',
                     'tech/index.html','clipper.html','tiktok-downloader.html','leaderboard/index.html']){
    const html=read(page);
    assert.ok(html.includes('/site-responsive.css?v=1'),page);
    assert.ok(html.includes('/site-experience.js?v=4'),page);
  }
  const css=read('site-responsive.css');
  assert.ok(css.includes('a.skip-link:focus'));
  assert.ok(css.includes('dialog.site-command-dialog[open]'));
  assert.ok(css.includes('.n29-nav-links'));
});

test('site quick jump is focused on BLR, portfolio and Glutony projects',()=>{
  for(const group of ['Play','Rules','Create','Support'])
    assert.ok(shared.includes("group:'"+group+"'"),group);
  for(const route of ['/','/servers/','/servers/customs/','/tech/','/tools/',
                      '/clipper.html','/tiktok-downloader.html','/leaderboard/'])
    assert.ok(shared.includes(route),route);
  assert.ok(shared.includes('https://n29.kz/'));
  assert.ok(shared.includes('Glutony Discord app'));
  assert.ok(!shared.includes('gk-reaction-trainer'));
  assert.ok(!shared.includes("url:'/tech/admin/'"),'private admin not public nav');
});

test('quick jump internal destinations point to files in the same repository',()=>{
  const targets=[...shared.matchAll(/\burl:'([^']+)'/g)].map(m=>m[1]);
  for(const href of targets){
    if(!href.startsWith('/'))continue;
    const path=new URL(href,'https://blr.n29.kz').pathname;
    const expected=path.endsWith('/')?join(root,path.slice(1),'index.html'):join(root,path.slice(1));
    assert.ok(existsSync(expected),href+' should resolve to static file');
  }
});

test('misc routes and pages retain their existing functionality hooks',()=>{
  assert.equal((read('index.html').match(/class="site-route-card"/g)||[]).length,4);
  assert.ok(read('tech/index.html').includes('id="support"'));
  assert.ok(read('tech/admin/index.html').includes('id="entry-form"'));
  assert.ok(read('servers/index.html').includes('id="mode-8v8"'));
  assert.ok(read('servers/customs/index.html').includes('id="post"'));
  assert.ok(read('clipper.html').includes('id="export"'));
  assert.ok(read('tiktok-downloader.html').includes('id="fix-file"'));
  assert.ok(read('leaderboard/index.html').includes('class="n29-nav"'));
  assert.ok(read('leaderboard/index.html').includes('/site-unify.css?v=2'));
  assert.ok(read('404.html').includes('class="n29-nav"'));
  assert.ok(read('404.html').includes('href="/tools/"'));
  assert.ok(read('sitemap.xml').includes('https://blr.n29.kz/tools/'));
  const theme=read('site-unify.css');
  assert.ok(theme.includes('Space Grotesk'));
  assert.ok(theme.includes('DM Sans'));
  assert.ok(theme.includes('Space Mono'));
});
