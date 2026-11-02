import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)));
const read=file=>readFileSync(join(root,file),'utf8');
const publicPages=[
  'index.html',
  'servers/index.html',
  'servers/customs/index.html',
  'tech/index.html',
  'clipper.html',
  'tiktok-downloader.html'
];
const linkedDestinations=[
  '/','/servers/','/servers/customs/','/tech/','/#tools',
  '/tech/#support','/clipper.html','/tiktok-downloader.html','/leaderboard/'
];
const shared=read('site-experience.js');

test('all core public pages load the new shared navigation assets',()=>{
  for(const file of publicPages){
    const html=read(file);
    assert.ok(html.includes('/site-experience.js?v=2'),file+' missing navigation script');
    assert.ok(html.includes('/site-theme.css?v=2'),file+' missing navigation styles');
    assert.ok(html.includes('href="/tech/"'),file+' missing tech rules link');
    assert.ok(html.includes('href="/servers/"'),file+' missing server finder link');
    if(file!=='index.html')assert.ok(html.includes('data-site-connect'),file+' missing explore site map');
  }
});

test('quick jump categories, links and support resources are present',()=>{
  for(const category of ['Play','Rules','Create','Support'])
    assert.ok(shared.includes("group:'"+category+"'"),category);
  for(const href of linkedDestinations)
    assert.ok(shared.includes(href),href);
  assert.ok(shared.includes('https://discord.gg/dgV4p83EHA'));
  assert.ok(shared.includes('https://discord.gg/bluelockrivals'));
  assert.ok(shared.includes('https://n29dev.github.io/gk-reaction-trainer'));
  assert.ok(shared.includes('https://discord.com/oauth2/authorize?client_id='));
  assert.ok(!shared.includes("url:'/tech/admin/'"),'private editor must not appear in public search');
  assert.ok(shared.includes('site-command-group'));
  assert.ok(shared.includes('initSiteConnections();'));
});

test('every internal route named in quick jump resolves to a static entry page',()=>{
  const links=[...shared.matchAll(/\burl:'([^']+)'/g)].map(match=>match[1]);
  for(const href of links){
    if(!href.startsWith('/'))continue;
    const url=new URL(href,'https://blr.n29.kz');
    const page=url.pathname.endsWith('/')?join(root,url.pathname.slice(1),'index.html'):join(root,url.pathname.slice(1));
    assert.ok(existsSync(page),href+' points to missing page');
  }
  assert.ok(read('index.html').includes('id="tools"'));
  assert.ok(read('tech/index.html').includes('id="support"'));
});

test('homepage has six curated routes and direct help, not just server modes',()=>{
  const home=read('index.html');
  assert.equal((home.match(/class="site-route-card"/g)||[]).length,6);
  assert.ok(home.includes('href="/tech/#support"'));
  assert.ok(home.includes('href="/servers/customs/"'));
  assert.ok(home.includes('href="/tech/"'));
});

test('CC leaderboard is connected as historical archive without changing its scoring scripts',()=>{
  const leaderboard=read('leaderboard/index.html');
  assert.ok(leaderboard.includes('class="hub-backnav"'));
  assert.ok(leaderboard.includes('href="/tech/"'));
  assert.ok(shared.includes('CC leaderboard (Sep 2026 archive)'));
  const css=read('leaderboard/styles.css');
  assert.ok(css.includes('.hub-backnav'));
});

test('shared site map and 404 include new support and creator paths',()=>{
  for(const href of ['/servers/customs/','/tech/','/#tools','/tech/#support'])
    assert.ok(read('404.html').includes('href="'+href+'"'),href);
  const css=read('site-theme.css');
  assert.ok(css.includes('.site-connect-grid'));
  assert.ok(css.includes('.site-connect-link'));
  assert.ok(css.includes('.site-command-group'));
});
