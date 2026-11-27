import test from 'node:test';
import assert from 'node:assert/strict';
import './motion.js';
const m=globalThis.ReplayMotion;
const identity=[0,0,0,1,0,0,0,1,0,0,0,1],rot=[2,0,0,-1,0,0,0,-1,0,0,0,1];
test('imports only supported R6 clips, interpolates and loops',()=>{const c=(time,cf)=>({time,poses:[{name:'HumanoidRootPart',weight:0,children:[{name:'Torso',weight:1,cframe:cf,children:[]}]}]});assert.deepEqual(m.load({clips:[{id:'123',duration:1,loop:false,frames:[c(0,identity),c(1,rot)]},{id:'456',duration:1,frames:[{time:0,poses:[{name:'BALL',weight:1,cframe:identity}]}]}]}),{count:1,skipped:1});const pose=m.sample('123',.5).Torso;assert.equal(pose[0],1);assert.ok(Math.abs(pose[3])<1e-8);assert.ok(Math.abs(pose[4])>.99);assert.deepEqual(m.sample('123',1.5,true),m.sample('123',.5));assert.equal(m.sample('456',0),null);});
test('R6 rest transforms use root-centered torso and three-stud sole offset',()=>{const t=m.transforms();assert.deepEqual(t.Torso.slice(0,3),[0,0,0]);assert.deepEqual(t.Head.slice(0,3),[0,1.5,0]);assert.deepEqual(t['Right Leg'].slice(0,3),[.5,-2,0]);assert.deepEqual(t['Left Leg'].slice(0,3),[-.5,-2,0]);assert.deepEqual(m.point(t['Left Leg'],0,-1,0),[-.5,-3,0]);});

test('normal walk, backward walk and running use distinct BLR rates',()=>{
 const prev={id:'1',cf:[0,3,0,0,0]},actor=(z,hasBall=false)=>({id:'1',cf:[0,3,z,0,0],hasBall});
 const walk=m.gait(actor(-2.3),prev,.1,0);assert.equal(walk.mode,'walk');assert.equal(walk.id,m.ID.walk);assert.ok(Math.abs(walk.rate-23/14)<1e-9);
 const back=m.gait(actor(2.3),prev,.1,0);assert.equal(back.mode,'back');assert.ok(Math.abs(back.rate-23/24)<1e-9);
 const run=m.gait(actor(-3.3),prev,.1,0);assert.equal(run.mode,'run');assert.ok(Math.abs(run.rate-33/32)<1e-9);
 assert.equal(m.gait(actor(-2.0,true),prev,.1,0).mode,'walk');
 assert.equal(m.gait(actor(-3.0,true),prev,.1,0).mode,'run');
 assert.equal(m.gait(actor(-100),prev,.1,0).mode,'idle');
});
test('phase integrates speed and is deterministic across backward seeks',()=>{
 const frames=Array.from({length:300},(_,i)=>({t:i/10,players:[{id:'1',cf:[0,3,-3.3*i,0,0]}]}));
 m.resetTimeline();const early=m.statesAt(frames,10,0).get('1');assert.equal(early.mode,'run');assert.ok(Math.abs(early.phase-.9*33/32)<1e-8);
 const late=m.statesAt(frames,250,0).get('1');assert.ok(late.phase>early.phase);
 assert.deepEqual(m.statesAt(frames,10,0).get('1'),early);
 assert.deepEqual(m.statesAt(frames,250,0).get('1'),late);
});
