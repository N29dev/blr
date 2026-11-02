import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLE_GROUPS, STYLES, ALL_STYLE_NAMES, GENERAL, TECHS, STATUS, videoUrl, slug} from './data.js';

test('all style names and technique IDs are unique',()=>{
  assert.equal(new Set(ALL_STYLE_NAMES).size,ALL_STYLE_NAMES.length);
  assert.equal(new Set(TECHS.map(t=>t.id)).size,TECHS.length);
  assert.equal(STYLES.length,53,'32 base/regular + additional recent styles and 14 event variants');
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

test('NEL variants are not silently given base-style classifications',()=>{
  const cases=TECHS.filter(t=>t.id.startsWith('nagi-'));
  assert.ok(cases.length>0);
  assert.ok(cases.every(t=>t.styles.includes('Nagi')));
  assert.ok(cases.every(t=>!t.styles.includes('NEL Nagi')));
  assert.ok(STYLES.some(s=>s.name==='NEL Nagi'));
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
