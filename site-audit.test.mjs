/**
 * Static, network-free BL:R repository audit.
 * Run: node --test site-audit.test.mjs
 * Every internal page, asset, explicit anchor, primary nav item, and media
 * control must stay valid as the project grows.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('.',import.meta.url)));
const origin='https://blr.n29.kz';
const pages=[
  '/','/404.html','/clipper.html','/tiktok-downloader.html','/tools/',
  '/servers/','/servers/customs/','/tech/','/tech/admin/',
  '/leaderboard/','/leaderboard/admin.html'
];
const pageFile=route=>join(root,route.endsWith('/')?route.slice(1)+'index.html':route.slice(1));
const read=path=>readFileSync(join(root,path),'utf8');
const fromRoute=route=>readFileSync(pageFile(route),'utf8');
const idSet=source=>new Set([...source.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]));
const attrRefs=source=>{
  // Ignore assignments in embedded JS/CSS, which are not HTML attributes.
  const markup=source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
  return [...markup.matchAll(/\s(?:href|src|action)\s*=\s*(["'])(.*?)\1/gis)]
    .map(m=>m[2].replaceAll('&amp;','&'));
};

test('entire HTML site: internal route, static asset, and fragment references resolve',()=>{
  for(const route of pages){
    const html=fromRoute(route);
    const ownIds=idSet(html);
    const allIds=[...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]);
    assert.equal(allIds.length,ownIds.size,route+' has duplicate DOM IDs');
    for(const href of attrRefs(html)){
      if(!href||href.startsWith('data:')||href.startsWith('javascript:'))continue;
      let url;
      try{url=new URL(href,origin+route);}catch{continue;}
      if(url.origin!==origin)continue;
      const path=url.pathname;
      // Explicit Cloudflare Worker endpoints are not static GitHub Pages files.
      // Keep the allowlist narrow so broken links are still detected.
      if(new Set(['/auth/roblox/start','/auth/logout','/auth/roblox/callback','/api/account/me']).has(path))continue;
      const local=pageFile(path);
      assert.ok(existsSync(local),route+' refers to missing '+href);
      // 'Top of page' fragments and dynamic/hash-based state are excluded.
      if(!url.hash||url.hash==='#')continue;
      if(!local.endsWith('.html'))continue;
      const targetIds=path===route?ownIds:idSet(readFileSync(local,'utf8'));
      const fragment=decodeURIComponent(url.hash.slice(1));
      assert.ok(targetIds.has(fragment),route+' has broken anchor '+href);
    }
  }
});

test('shared portfolio navigation is present with correct page identity',()=>{
  const active={
    '/':'Home','/tools/':'Creator tools','/servers/':'Servers',
    '/servers/customs/':'Customs','/tech/':'Tech rules',
    '/tech/admin/':'Tech rules','/clipper.html':'Creator tools',
    '/tiktok-downloader.html':'Creator tools'
  };
  for(const [route,current] of Object.entries(active)){
    const html=fromRoute(route);
    assert.equal((html.match(/class="n29-nav"/g)||[]).length,1,route+' missing/duplicate nav');
    assert.ok(html.includes('/site-unify.css?v=2'),route+' missing shared theme');
    assert.ok(html.includes('aria-current="page">'+current+'</a>'),route+' wrong selected nav item');
    assert.ok(html.includes('/site-motion.css?v=1'),route+' missing motion CSS');
    assert.ok(html.includes('/site-motion.js?v=1'),route+' missing motion JS');
    for(const href of ['/','/servers/','/servers/customs/','/tech/','/tools/','/tech/#support'])
      assert.ok(html.includes('href="'+href+'"'),route+' missing nav '+href);
  }
  for(const route of ['/leaderboard/','/404.html']){
    const html=fromRoute(route);
    assert.ok(html.includes('class="n29-nav"'),route+' missing nav');
    assert.ok(html.includes('/site-motion.css?v=1'));
    assert.ok(html.includes('/site-motion.js?v=1'));
  }
});

test('creator widgets, source scripts and worker path survive the /tools/ migration',()=>{
  const homepage=fromRoute('/');
  const studio=fromRoute('/tools/');
  assert.ok(homepage.includes('id="tools"'),'keep old home #tools bookmarks valid');
  assert.ok(!homepage.includes('id="patch-video"'),'homepage should no longer host creator processor');
  assert.ok(!homepage.includes('id="compress-video"'));
  for(const id of ['tiktok-url','tiktok-check','tiktok-results',
                   'compress-video','compress-button','compress-progress','compress-download',
                   'compress-cancel']){
    assert.ok(studio.includes('id="'+id+'"'),'creator studio missing '+id);
  }
  for(const src of ['/tools/tiktok-info.js','/tools/compress.mjs'])
    assert.ok(studio.includes('src="'+src+'?v=1"'),'creator studio missing '+src);
  assert.ok(!studio.includes('id="patch-video"'),'outdated patcher must be removed');
  assert.ok(!studio.includes('src="/tools/patch.mjs'),'patched method must not load');
  assert.ok(studio.includes('720P 60FPS Method')&&studio.includes('FPS Method'),'show current alternatives');
  assert.ok(read('tools/compress.mjs').includes("new URL('/ffmpeg-worker.js', window.location.origin)"));
});

test('Creator Studio is sorted by workflow with isolated CSS and all existing controls',()=>{
  const html=fromRoute('/tools/');
  assert.ok(html.includes('data-page="tools"'),'tool page must not inherit homepage-only styles');
  assert.ok(html.includes('/tools/controls.css?v=1'),'isolated functional controls stylesheet missing');
  assert.ok(html.includes('/tools/style.css?v=3'),'workflow layout stylesheet missing');
  assert.ok(!html.includes('/tools/legacy.css'),'old homepage stylesheet must not load in Creator Studio');
  const video=html.indexOf('id="video-tools"'),tiktok=html.indexOf('id="tiktok-tools"');
  assert.ok(video>0&&tiktok>video,'video workflow must precede TikTok tools');
  const order=['compress-tool','patch-tool','clipper-tool','analyze-tool','tiktok-download-tool'];
  const offsets=order.map(id=>html.indexOf('id="'+id+'"'));
  assert.ok(offsets.every(offset=>offset>=0),'missing a tool card');
  assert.deepEqual([...offsets].sort((a,b)=>a-b),offsets,'tool cards should follow intended workflow');
  const categories=['Video editing &amp; repair','TikTok tools'];
  for(const label of categories)assert.ok(html.includes(label));
  const counts=order.map(id=>(html.match(new RegExp('id="'+id+'"','g'))||[]).length);
  assert.deepEqual(counts,[1,1,1,1,1],'each tool must appear exactly once');
});

test('homepage has four distinct destinations and stable profile grid design',()=>{
  const html=fromRoute('/');
  assert.equal((html.match(/class="site-route-card"/g)||[]).length,4);
  assert.ok(html.indexOf('id="play"')<html.indexOf('id="stats"'),'Play section should precede profile');
  assert.ok(html.includes('/home-layout.css?v=1'));
  assert.ok(html.includes('id="rbx-avatar"'));
  assert.ok(html.includes('id="rbx-display"'));
  assert.ok(html.includes('id="rbx-username"'));
  assert.equal((html.match(/class="stat"/g)||[]).length,9);
  for(const href of ['/servers/','/servers/customs/','/tech/','/tech/#support'])
    assert.ok(html.includes('href="'+href+'"'),'homepage missing destination '+href);
  const css=read('home-layout.css');
  assert.ok(css.includes('#play .site-route-grid'));
  assert.ok(css.includes('#stats .profile-card'));
  assert.ok(css.includes('grid-template-columns:1fr!important'),'mobile layout must stack');
});

test('JavaScript uses existing static DOM IDs for core tools and data pages',()=>{
  const pairs=[
    ['/','home-matchday.js'],
    ['/tools/','tools/tiktok-info.js'],
    ['/tools/','tools/compress.mjs'],
    ['/servers/','servers/globe.js'],
    ['/tech/','tech/app.js'],
    ['/tech/admin/','tech/admin/app.js'],
    ['/leaderboard/','leaderboard/public.js'],
    ['/leaderboard/admin.html','leaderboard/admin.js']
  ];
  for(const [route,src] of pairs){
    const ids=idSet(fromRoute(route));
    const code=read(src);
    const referenced=[
      ...[...code.matchAll(/\bgetElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m=>m[1]),
      ...[...code.matchAll(/document\.querySelector\(\s*['"]#([A-Za-z0-9_-]+)['"]\s*\)/g)].map(m=>m[1])
    ];
    for(const id of referenced)assert.ok(ids.has(id),src+' refers to missing #'+id+' on '+route);
  }
});

test('project links on the site only feature BL:R, portfolio and Glutony',()=>{
  const allowed=new Set(['blr','Glutony','portfolio']);
  const publicContent=[
    ...pages.map(route=>fromRoute(route)),
    read('site-experience.js')
  ].join('\n');
  const repos=[...publicContent.matchAll(/https:\/\/github\.com\/N29dev\/([A-Za-z0-9._-]+)/g)].map(m=>m[1]);
  for(const repo of repos)assert.ok(allowed.has(repo),'unrequested project link '+repo);
  assert.ok(!publicContent.includes('gk-reaction-trainer'),'separate GK trainer should not be promoted');
  assert.ok(publicContent.includes('https://n29.kz/'),'portfolio should be discoverable');
  assert.ok(publicContent.includes('https://github.com/N29dev/Glutony'),'Glutony attribution should remain');
});

test('live-data and owner-maintained features are unchanged by the polish layer',()=>{
  const server=fromRoute('/servers/');
  assert.ok(server.includes("const API = 'https://glutony.scp343hey.workers.dev'"));
  assert.ok(server.includes("VALID_MODES = ['8v8','pro']"));
  assert.ok(!server.includes('id="mode-main"'));
  assert.ok(server.includes("if(params.get('mode')==='main')"));
  assert.ok(server.includes("new URLSearchParams(location.search)"));
  assert.ok(fromRoute('/servers/customs/').includes('id="post"'));
  assert.ok(fromRoute('/tech/').includes('id="style-grid"'));
  assert.ok(fromRoute('/tech/admin/').includes('id="entry-form"'));
  assert.ok(fromRoute('/tech/').includes('https://discord.gg/dgV4p83EHA'));
  assert.ok(fromRoute('/tech/').includes('https://discord.com/channels/1313206300813033532/1313206301232463980'));
  assert.ok(fromRoute('/leaderboard/').includes('public.js?v=23'));
});


test('Servers and Customs share one match switcher and use progressive cross-page view transitions',()=>{
  const servers=fromRoute('/servers/');
  const customs=fromRoute('/servers/customs/');
  const motionCSS=read('site-motion.css');
  assert.ok(servers.includes('class="mode-panel n29-mode-switch"'),'public server tabs should use shared segmented design');
  assert.ok(customs.includes('class="tabs n29-mode-switch"'),'custom match tabs should use shared segmented design');
  assert.ok(servers.includes('href="/servers/customs/"'),'public server page should reach Customs');
  assert.ok(!customs.includes('href="/servers/?mode=main"'),'retired Main should not appear in custom match tabs');
  assert.ok(customs.includes('href="/servers/?mode=8v8"'),'custom match page should reach 8v8');
  assert.ok(customs.includes('href="/servers/?mode=pro"'),'custom match page should reach Pro');
  assert.ok(customs.includes('href="/servers/customs/" class="selected" aria-current="page"'));
  assert.ok(motionCSS.includes('@view-transition { navigation: auto; }'));
  assert.ok(motionCSS.includes('view-transition-name:n29-shared-nav'));
  assert.ok(motionCSS.includes('view-transition-name:n29-match-hero'));
  assert.ok(motionCSS.includes('@media (prefers-reduced-motion: no-preference)'),'transitions must honor reduced motion');
  assert.ok(motionCSS.includes('::view-transition-old(root)'));
  assert.ok(motionCSS.includes('::view-transition-new(root)'));
});

test('customs, tech rules and creator studio have offscreen and dynamic-content reveal coverage',()=>{
  const js=read('site-motion.js');
  for(const selector of [
    'body[data-page="customs"] header.hero',
    'body[data-page="customs"] .panel.controls',
    'body[data-page="customs"] #cards > .card',
    'body[data-page="servers"] #servers > .server',
    '.style-group','.style-tile','.tech-entry','.faq details',
    '.site-hero-panel','.site-hero-copy','.tool-card',
    "'#cards'","'#servers'","'#style-grid'","'#tech-entries'"
  ])assert.ok(js.includes(selector),'animation coverage missing '+selector);
  assert.ok(js.includes("prefers-reduced-motion: reduce"));
  assert.ok(js.includes('MutationObserver'),'live cards must reveal even when dynamically rendered');
  assert.ok(!js.includes("preventDefault("),'motion must never block navigation');
});

test('motion is opt-in, reduced-motion aware, and never blocks navigation',()=>{
  const js=read('site-motion.js'),css=read('site-motion.css');
  assert.ok(js.includes("prefers-reduced-motion: reduce"));
  assert.ok(js.includes('IntersectionObserver'));
  assert.ok(js.includes('getBoundingClientRect'));
  assert.ok(js.includes('requestAnimationFrame'));
  assert.ok(js.includes('aria-current'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('.n29-will-reveal.n29-revealed'));
  assert.ok(!js.includes('preventDefault('));
  assert.ok(!js.includes('window.location.assign('));
});
