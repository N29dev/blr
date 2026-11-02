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
  for(const id of ['patch-video','patch-button','patch-download',
                   'tiktok-url','tiktok-check','tiktok-results',
                   'compress-video','compress-button','compress-progress','compress-download',
                   'compress-cancel','posting-device']){
    assert.ok(studio.includes('id="'+id+'"'),'creator studio missing '+id);
  }
  for(const src of ['/tools/tiktok-info.js','/tools/patch.mjs','/tools/compress.mjs'])
    assert.ok(studio.includes('src="'+src+'?v=1"'),'creator studio missing '+src);
  assert.ok(read('tools/compress.mjs').includes("new URL('/ffmpeg-worker.js', window.location.origin)"));
});

test('JavaScript uses existing static DOM IDs for core tools and data pages',()=>{
  const pairs=[
    ['/','home-matchday.js'],
    ['/tools/','tools/tiktok-info.js'],
    ['/tools/','tools/patch.mjs'],
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
  assert.ok(server.includes("VALID_MODES = ['main','8v8','pro']"));
  assert.ok(server.includes("new URLSearchParams(location.search)"));
  assert.ok(fromRoute('/servers/customs/').includes('id="post"'));
  assert.ok(fromRoute('/tech/').includes('id="style-grid"'));
  assert.ok(fromRoute('/tech/admin/').includes('id="entry-form"'));
  assert.ok(fromRoute('/tech/').includes('https://discord.gg/dgV4p83EHA'));
  assert.ok(fromRoute('/tech/').includes('https://discord.com/channels/1313206300813033532/1313206301232463980'));
  assert.ok(fromRoute('/leaderboard/').includes('public.js?v=23'));
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
