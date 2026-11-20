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

import {labelLayout} from './icons.mjs';
test('reference label wrapping and width-based fitting',()=>{
  const measure=s=>[...s].reduce((n,c)=>n+('MW'.includes(c)?1:'ilI '.includes(c)?.32:.72),0);
  for(const name of ['Gagamaru','Kaiser','Sae','Gingerbread','NEL Nagi','NEL Isagi','NEL Rin','Ace Eater','Wild Card']){
    const result=labelLayout(name,measure);
    assert.deepEqual(result.lines,[name]);
    assert.ok(measure(name)*result.font<=74.001);
  }
  assert.deepEqual(labelLayout('NEL Bachira',measure).lines,['NEL','Bachira']);
  assert.deepEqual(labelLayout('Bloodmoon Rin',measure).lines,['Blood','Moon Rin']);
  assert.deepEqual(labelLayout('Master Of All Trades',measure).lines,['Master Of','All Trades']);
  for(const {name,nel} of STYLES_WIKI){const result=iconSpec(name,'style','',nel,measure);assert.ok(result.lines.every(line=>measure(line)*result.font<=74.001));}
  for(const {name} of FLOWS){const result=iconSpec(name,'flow','',false,measure);assert.ok(result.lines.every(line=>measure(line)*result.font<=74.001));}
});

import {matchesQuery} from './content.mjs';
test('wiki search normalizes punctuation, word order, aliases and prioritizes exact matches',()=>{
 assert.equal(searchWiki('nagi')[0].url,'/styles/nagi/');
 assert.equal(searchWiki('nel aiku')[0].url,'/styles/aiku/');
 assert.ok(searchWiki('buddhas blessing').some(x=>x.url==='/flows/buddha-s-blessing/'));
 assert.ok(searchWiki('progression').some(x=>x.url==='/progression/'));
 assert.ok(matchesQuery("king's authority","authority kings"));
 assert.equal(searchWiki('  ').length,0);
});

test('Otoya wiki rarity reflects November rework, separately from tech snapshot',()=>{assert.equal(byId('otoya').group,'legendary');assert.ok(byId('hiori').nel);});
import fs from 'node:fs';
import {projectAnnouncements} from './announcement-projector.mjs';
import reviewed from './announcement-data.mjs';
test('reviewed archive and route records remain source-linked and generated from one dataset',()=>{
 const records=projectAnnouncements(reviewed,STYLES_WIKI.map(x=>x.id),FLOWS.map(x=>x.id));
 assert.ok(records.updates.length>=120);
 assert.equal(records.updates[0].date,'2026-11-14');
 assert.ok(records.codes.every(x=>x.status==='Unverified'&&x.reward));
 assert.ok(!records['styles/karasu'].abilities.some(a=>a.name==='Extraordinary Striker Pass'));
 assert.ok(records['styles/otoya'].abilities.some(a=>a.name==='Ninjaristic Presence'));
 for(const [key,data] of Object.entries(records)){assert.deepEqual(JSON.parse(fs.readFileSync(new URL('./records/'+key+'.json',import.meta.url),'utf8')),data);const walk=x=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(x.source)assert.match(x.source,/^https:\/\/discord\.com\/channels\/1304535758899777626\/1304576435800899694\/\d+$/);Object.values(x).forEach(walk);}};walk(data);}
});

import './tested-data.test.mjs';

test('expanded historical coverage and source dates',()=>{
 const records=projectAnnouncements(reviewed,STYLES_WIKI.map(x=>x.id),FLOWS.map(x=>x.id));
 assert.equal(Object.keys(reviewed.kits).length,43);
 assert.ok(records.updates.length>=159);
 assert.ok(records.codes.length>=233);
 assert.ok(records['styles/charles'].abilities.some(r=>r.name==='Contrarian Pass'));
 assert.ok(records['styles/loki'].abilities.some(r=>r.name==='Velocity Shot'));
 assert.ok(records['styles/gingerbread-charles'].abilities.some(r=>r.name==='Cookie Cross'));
 assert.ok(records['flows/target-man'].facts.some(r=>r.title==='Volley and header reductions'));
 const refs=[...reviewed.rows.map(r=>[r[1],r[0]]),...Object.values(reviewed.kits).map(r=>[r[0],r[1]]),...Object.values(reviewed.extra).flat().map(r=>[r[0],r[1]]),...reviewed.codeRows.map(r=>[r[0],r[1]]),...reviewed.facts.map(r=>[r[0],r[1]])];
 for(const [id,date] of refs)assert.equal(new Date(Number((BigInt(id)>>22n)+1420070400000n)).toISOString().slice(0,10),date);
});
