// Run with: node servers/globe-regions.test.mjs
// Pure region-grouping smoke tests; no browser, Roblox or RoValra network required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('./globe.js',import.meta.url),'utf8');
const begin=src.indexOf('const normalized=');
const end=src.indexOf('function loadScript(url){');
assert.ok(begin>=0&&end>begin,'Find pure globe region functions');
const helpers=vm.runInNewContext('(()=>{'+src.slice(begin,end)+';return {grouping,continent,coordForName,AREA_ORDER,summary,state};})()');

const locations=[
 ['Atlanta','US','United States'],['Ashburn','US','United States'],['Chicago','US','United States'],
 ['Dallas','US','United States'],['New York','US','United States'],['Los Angeles','US','United States'],
 ['Miami','US','United States'],['San Jose','US','United States'],['Seattle','US','United States'],
 ['Houston','US','United States'],['Toronto','CA','Canada'],['Montreal','CA','Canada'],
 ['Vancouver','CA','Canada'],['Sao Paulo','BR','Brazil'],['Rio de Janeiro','BR','Brazil'],
 ['Buenos Aires',null,'Argentina'],['Santiago',null,'Chile'],['Bogota',null,'Colombia'],
 ['Lima',null,'Peru'],['Paris','FR','France'],['Frankfurt','DE','Germany'],['Amsterdam','NL','Netherlands'],
 ['London','GB','United Kingdom'],['Warsaw','PL','Poland'],['Stockholm','SE','Sweden'],
 ['Madrid','ES','Spain'],['Zurich','CH','Switzerland'],['Dublin','IE','Ireland'],
 ['Tokyo','JP','Japan'],['Singapore','SG','Singapore'],['Mumbai','IN','India'],
 ['Hong Kong','HK','Hong Kong'],['Seoul','KR','South Korea'],['Bangkok','TH','Thailand'],
 ['Jakarta','ID','Indonesia'],['Sydney','AU','Australia']
];
const servers=locations.map(([city,countryCode,country],i)=>({id:'server'+i,city,countryCode,country}));
const groups=helpers.grouping(servers);
assert.equal(groups.length,36,'All 36 distinct observed city labels produce separate regions');
assert.ok(groups.every(g=>g.count===1&&g.ids.length===1),'All server IDs retained');
assert.ok(groups.every(g=>helpers.coordForName(g.city)),'All sample cities have a plotted city center');
const counts=Object.fromEntries(helpers.AREA_ORDER.map(area=>[area,groups.filter(g=>g.area===area).length]));
assert.equal(counts.NA,13);
assert.equal(counts.SA,4);
assert.equal(counts.Brazil,2);
assert.equal(counts.Europe,9);
assert.equal(counts.Asia,7);
assert.equal(counts.Oceania,1);
assert.ok(groups.some(g=>g.area==='SA'&&g.country==='Argentina'),'Missing countryCode still maps Argentine servers to SA');
assert.ok(groups.some(g=>g.area==='Brazil'&&g.city==='Sao Paulo'));
const duplicate=helpers.grouping([...servers,{...servers[0],id:'server36'}]);
assert.equal(duplicate.length,36,'Same city aggregates into one region');
assert.equal(duplicate.find(g=>g.city==='Atlanta').count,2);
assert.deepEqual(Array.from(duplicate.find(g=>g.city==='Atlanta').ids),['server0','server36']);
const unknown=helpers.grouping([...servers,{id:'unknown',city:null,country:null,countryCode:null}]);
assert.equal(unknown.length,36,'Unknown region has no made-up marker');
// A pin covers a region grouping, not an arbitrary server. The inspector must
// derive occupancy/ping only from the server IDs in the selected region.
helpers.state.servers=[
 {id:'f1',city:'Frankfurt am Main',country:'Germany',countryCode:'DE',playing:7,maxPlayers:16,free:9,ping:62},
 {id:'f2',city:'Frankfurt am Main',country:'Germany',countryCode:'DE',playing:15,maxPlayers:16,free:1,ping:78},
 {id:'ams',city:'Amsterdam',country:'Netherlands',countryCode:'NL',playing:4,maxPlayers:10,free:6,ping:102}
];
const grouped=helpers.grouping(helpers.state.servers);
const frankfurt=grouped.find(g=>g.city==='Frankfurt am Main');
assert.ok(frankfurt,'Frankfurt am Main is a distinct map region');
assert.equal(helpers.coordForName('Frankfurt am Main')[0],8.6821,'Alias uses the real city center, not German centroid');
const details=helpers.summary(frankfurt);
assert.equal(details.servers.length,2);
assert.equal(details.players,22);
assert.equal(details.free,10);
assert.equal(details.ping,70);
assert.ok(details.servers.every(s=>s.city==='Frankfurt am Main'),
 'Tooltip and inspector must never include Amsterdam when targeting Frankfurt');
console.log('PASS: marker hover/inspector reflects only the actual selected servers.');
console.log('PASS: 36 observed region clusters, NA/SA/Brazil/Europe/Asia/Oceania grouping, geography and server ID filters.');
