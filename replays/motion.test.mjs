import test from 'node:test';
import assert from 'node:assert/strict';
import './motion.js';
const m=globalThis.ReplayMotion;
const identity=[0,0,0,1,0,0,0,1,0,0,0,1],rot=[2,0,0,-1,0,0,0,-1,0,0,0,1];
test('imports only supported R6 clips, interpolates and loops',()=>{const c=(time,cf)=>({time,poses:[{name:'HumanoidRootPart',weight:0,children:[{name:'Torso',weight:1,cframe:cf,children:[]}]}]});assert.deepEqual(m.load({clips:[{id:'123',duration:1,loop:false,frames:[c(0,identity),c(1,rot)]},{id:'456',duration:1,frames:[{time:0,poses:[{name:'BALL',weight:1,cframe:identity}]}]}]}),{count:1,skipped:1});const pose=m.sample('123',.5).Torso;assert.equal(pose[0],1);assert.ok(Math.abs(pose[3])<1e-8);assert.ok(Math.abs(pose[4])>.99);assert.deepEqual(m.sample('123',1.5,true),m.sample('123',.5));assert.equal(m.sample('456',0),null);});
test('R6 rest transforms use root-centered torso and three-stud sole offset',()=>{const t=m.transforms();assert.deepEqual(t.Torso.slice(0,3),[0,0,0]);assert.deepEqual(t.Head.slice(0,3),[0,1.5,0]);assert.deepEqual(t['Right Leg'].slice(0,3),[.5,-2,0]);assert.deepEqual(t['Left Leg'].slice(0,3),[-.5,-2,0]);assert.deepEqual(m.point(t['Left Leg'],0,-1,0),[-.5,-3,0]);});
