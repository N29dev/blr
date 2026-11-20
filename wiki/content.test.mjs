import test from 'node:test';import assert from 'node:assert/strict';import {STYLES_WIKI,RARITIES,filterStyles,byId,PRACTICE,ARTICLES,PATCHES} from './content.mjs';
test('style ids are unique and linkable',()=>{assert.equal(new Set(STYLES_WIKI.map(s=>s.id)).size,STYLES_WIKI.length);for(const s of STYLES_WIKI)assert.equal(byId(s.id),s);});
test('search and rarity use shared roster',()=>{assert.equal(filterStyles('NEL Nagi')[0].name,'Nagi');assert.equal(filterStyles('don lorenzo')[0].id,'don-lorenzo');for(const r of RARITIES)assert.ok(filterStyles('',r.id).every(s=>s.group===r.id));assert.equal(filterStyles('not-a-style').length,0);});
test('practice goals are stable and unique',()=>assert.equal(new Set(PRACTICE.map(p=>p.id)).size,PRACTICE.length));
test('published content references existing styles and has sources',()=>{for(const [id,article] of Object.entries(ARTICLES)){assert.ok(byId(id));for(const records of Object.values(article))for(const r of records){assert.equal(new URL(r.source).protocol,'https:');assert.match(r.verified,/^\d{4}-\d{2}-\d{2}$/);}}for(const p of PATCHES){assert.equal(new URL(p.source).protocol,'https:');assert.match(p.verified,/^\d{4}-\d{2}-\d{2}$/);}});

import {FLOWS,searchWiki} from './content.mjs';
test('flow names and both article types are searchable',()=>{assert.equal(FLOWS.length,33);assert.equal(new Set(FLOWS.map(f=>f.id)).size,33);assert.ok(searchWiki('nel nagi').some(x=>x.url==='/styles/nagi/'));assert.ok(searchWiki('buddha').some(x=>x.url==='/flows/buddha-s-blessing/'));});

import {iconSpec} from './icons.mjs';
test('procedural icons preserve observed appearance rather than guessing flow rarity',()=>{
  assert.equal(iconSpec('Trap','flow').palette,'gold');
  assert.equal(iconSpec('Puzzle','flow').palette,'blue');
  assert.equal(iconSpec('King\'s Authority','flow').palette,'red');
  assert.equal(iconSpec('Genius','flow').palette,'purple');
  assert.equal(iconSpec('Brazil','flow').palette,'silver');
  assert.equal(iconSpec('Nagi','style','legendary',true).palette,'silver');
  assert.equal(iconSpec('Igaguri','style','other').palette,'blue');
  assert.equal(iconSpec('Karasu','style','mythic').palette,'purple');
  assert.equal(iconSpec('Lavinho','style','master').master,true);
  assert.equal(iconSpec('Snuffy','style','master').master,true);
  assert.equal(iconSpec('Santa Lavinho','style','limited').master,false);
  for(const flow of FLOWS){const s=iconSpec(flow.name,'flow');assert.ok(s.font>0&&s.font<=29);assert.equal(s.master,false);}
});
