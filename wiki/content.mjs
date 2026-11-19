// Wiki starter content. Publish only sourced, reviewed factual entries.
import {STYLES, STYLE_GROUPS, NEL_VARIANTS, POLICY, slug} from '../tech/data.js';
export const ROSTER_AS_OF=POLICY.asOf;
export const STYLES_WIKI=STYLES.map(s=>Object.freeze({...s,id:slug(s.name),nel:NEL_VARIANTS.includes(s.name)}));
export const RARITIES=STYLE_GROUPS.map(({id,label})=>({id,label}));
// Key by style slug. A profile may contain overview, abilities, evolutions, progression, mastery, counterplay and history.
// Each factual record should include a source URL and verified date.
export const ARTICLES=Object.freeze({});
export const PATCHES=Object.freeze([]);
export const PRACTICE=Object.freeze([
  {id:'inputs',label:'Learn the kit and practice each input'},
  {id:'conditions',label:'Test activation conditions with and without possession'},
  {id:'timing',label:'Practice timing and combinations in controlled matches'},
  {id:'positioning',label:'Review positioning and decision-making in live matches'},
  {id:'counterplay',label:'Practice defending against the kit and review mistakes'}
]);
export function filterStyles(q='',rarity=''){
  const term=q.trim().toLowerCase().replace(/\s+/g,' ');
  return STYLES_WIKI.filter(s=>(!rarity||s.group===rarity)&&(!term||[s.name,s.id,s.nel?'NEL '+s.name:''].some(n=>n&&n.toLowerCase().includes(term))));
}
export const byId=id=>STYLES_WIKI.find(s=>s.id===id);
