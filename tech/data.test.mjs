import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLE_GROUPS, STYLES, ALL_STYLE_NAMES, GENERAL, TECHS, STATUS, videoUrl, slug, canonicalStyle, NEL_VARIANTS} from './data.js';

test('all style names and technique IDs are unique',()=>{
  assert.equal(new Set(ALL_STYLE_NAMES).size,ALL_STYLE_NAMES.length);
  assert.equal(new Set(TECHS.map(t=>t.id)).size,TECHS.length);
  assert.equal(STYLES.length,45,'NEL versions are merged into base characters');
  assert.equal(ALL_STYLE_NAMES[0],GENERAL);
  assert.equal(STYLE_GROUPS.length,8);
});

test('all moderation classifications are valid, source-faithful and attributed',()=>{
  assert.equal(TECHS.length,56);
  assert.equal(TECHS.filter(t=>t.status==='allowed').length,24);
  assert.equal(TECHS.filter(t=>t.status==='disallowed').length,19);
  assert.equal(TECHS.filter(t=>t.status==='punishable').length,13);
  for(const item of TECHS){
    assert.match(item.id,/^[a-z0-9-]+$/);
    assert.ok(STATUS[item.status]);
    assert.ok(item.name&&item.styles.length);
    assert.ok(item.styles.every(name=>ALL_STYLE_NAMES.includes(name)),item.id);
    assert.ok(item.video===''||videoUrl(item.video),item.id+' invalid video');
  }
});

test('NEL and base characters use one style, while limited/event styles remain separate',()=>{
  assert.equal(NEL_VARIANTS.length,8);
  for(const name of NEL_VARIANTS){
    assert.ok(STYLES.some(s=>s.name===name),name+' base style must be listed');
    assert.ok(!STYLES.some(s=>s.name==='NEL '+name),name+' must not have a second card');
    assert.equal(canonicalStyle('NEL '+name),name);
    assert.equal(canonicalStyle('nel   '+name.toLowerCase()),name);
  }
  assert.equal(canonicalStyle('NEL Nagi'),'Nagi');
  assert.equal(canonicalStyle('Nagi'),'Nagi');
  assert.equal(canonicalStyle('Skeleton Nagi'),'Skeleton Nagi');
  assert.equal(canonicalStyle('McNagi Fryshiro'),'McNagi Fryshiro');
  assert.equal(canonicalStyle('NEL Unknown Future Style'),'Unknown Future Style');
  assert.equal(canonicalStyle('NEL Nagi'),canonicalStyle('Nagi'));
  assert.equal(new Set(['NEL Nagi','Nagi','NEL Rin','Rin'].map(canonicalStyle)).size,2);
  const nagi=TECHS.filter(t=>t.styles.map(canonicalStyle).includes('Nagi'));
  assert.ok(nagi.some(t=>t.id==='nagi-delay-trap'));
  assert.ok(nagi.some(t=>t.id==='nagi-moonwalk'));
});

test('high-risk examples preserve their disallowed or punishable status',()=>{
  const byId=Object.fromEntries(TECHS.map(t=>[t.id,t]));
  for(const id of ['nagi-moonwalk','awk-auto-goal','reo-inf-copy','niko-inf-range-shot'])
    assert.equal(byId[id].status,'disallowed');
  for(const id of ['side-dive-fling','kaiser-impact-minibox','bunny-gamebreaking','zantetsu-double-explosive'])
    assert.equal(byId[id].status,'punishable');
});

test('YouTube-only link validation for creator-provided short clips',()=>{
  assert.equal(videoUrl('https://youtube.com/shorts/dQw4w9WgXcQ'),'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(videoUrl('https://youtu.be/dQw4w9WgXcQ'),'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(videoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1'),'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(videoUrl('https://youtube.com.evil.com/shorts/dQw4w9WgXcQ'),null);
  assert.equal(videoUrl('javascript:alert(1)'),null);
  assert.equal(videoUrl('https://www.youtube.com/shorts/bad'),null);
  assert.equal(videoUrl(''),null);
  assert.equal(slug('NEL Nagi'),'nel-nagi');
});
