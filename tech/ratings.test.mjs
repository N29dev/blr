import test from 'node:test';
import assert from 'node:assert/strict';
import {RATING_FIELDS,CORE_RATING_IDS,TAG_GROUPS,ALL_TECH_TAGS,validRating,overallRating} from './ratings.js';

test('ratings are optional until all four core values are set',()=>{
  assert.equal(overallRating(),null);
  assert.equal(overallRating({}),null);
  assert.equal(overallRating({execution:3,counter:5,advantage:4}),null);
  assert.equal(overallRating({execution:3,counter:5,advantage:4,consistency:3}),3.8);
  assert.equal(overallRating({execution:1,counter:5,advantage:5,consistency:5}),5);
  assert.equal(overallRating({execution:5,counter:1,advantage:1,consistency:1}),1);
});

test('GK save difficulty is optional and does not change overall',()=>{
  const ratings={execution:4,counter:5,advantage:5,consistency:3};
  assert.equal(overallRating(ratings),3.8);
  assert.equal(overallRating({...ratings,save:1}),3.8);
  assert.equal(overallRating({...ratings,save:5}),3.8);
});

test('all rating fields and tags have stable, unique identifiers',()=>{
  assert.deepEqual(CORE_RATING_IDS,['execution','counter','advantage','consistency']);
  assert.deepEqual(RATING_FIELDS.map(f=>f.id),[...CORE_RATING_IDS,'save']);
  assert.equal(new Set(ALL_TECH_TAGS).size,ALL_TECH_TAGS.length);
  assert.equal(TAG_GROUPS.flatMap(g=>g.tags).length,18);
  for(const field of RATING_FIELDS)assert.ok(field.label&&field.hint);
  assert.ok(validRating(1));
  assert.ok(validRating(5));
  for(const n of [0,6,2.5,'3',NaN,null])assert.equal(validRating(n),false);
  assert.equal(overallRating({execution:0,counter:4,advantage:4,consistency:4}),null);
});
