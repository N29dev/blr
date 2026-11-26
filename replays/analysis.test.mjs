import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('./analysis.js',import.meta.url),'utf8'),context);
const analyze=context.analyzeReplay;
const geometry={bounds:{minX:0,maxX:100,minZ:0,maxZ:75}};
const player=(x,held=false)=>({id:1,team:'Home',cf:[x,0,25],hasBall:held});
const away={id:2,team:'Away',cf:[90,0,25]};
const f=(t,x,ball,stats={})=>({t,players:[player(x,ball.owner===1),away],ball,localStats:stats});
const data=[
 f(0,10,{state:'held',owner:1,cf:[10,0,25]},{Goals:2,Style:'Aiku',Flow:'Puzzle'}),
 f(.1,12,{state:'free',cf:[12,0,25]},{Goals:3}),
 f(.2,14,{state:'unknown'}),
 f(.3,16,{state:'held',owner:2,cf:[90,0,25]}),
 f(.4,18,{state:'held',owner:2,cf:[90,0,25]},{Goals:3}),
 f(1,50,{state:'free'})
];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
test('time-weighted possession, distance, gaps, and match counter deltas',()=>{
 const m=analyze(data,geometry,{localId:1}),a=m.actors.get('1');
 close(m.covered,.4);close(m.gapSeconds,.6);
 close(m.teams.Home,.1);close(m.teams.Away,.1);close(m.teams.free,.1);close(m.teams.unknown,.1);
 close(a.distance,8);close(a.held,.1);close(a.heat.reduce((x,y)=>x+y,0),.4);
 assert.equal(a.counters.Goals,1);assert.equal(m.actors.get('2').counters.Goals,undefined);
 assert.equal([...a.styles][0],'Aiku');
});
test('time range and carry-forward style, missing values remain unavailable',()=>{
 const m=analyze(data,geometry,{localId:1,start:.15,end:.35}),a=m.actors.get('1');
 close(m.covered,.2);close(a.distance,4);close(a.held,0);
 assert.equal([...a.styles][0],'Aiku');assert.equal(a.counters.Saves,undefined);
});
test('teleport excluded from movement, position remains observed',()=>{
 const m=analyze([f(0,1,{state:'free'}),f(.1,99,{state:'free'})],geometry);
 const a=m.actors.get('1');close(a.distance,0);close(a.excluded,.1);close(a.seconds,.1);
});
test('explicit cutscene removes interval',()=>{
 const m=analyze([f(0,10,{state:'free'},{InCutscene:true}),f(.1,11,{state:'free'})],geometry,{localId:1});
 close(m.covered,0);close(m.gapSeconds,.1);
});
