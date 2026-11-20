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

export const FLOWS=Object.freeze(["Ace Eater","Awakened Genius","Bee Freestyle","Brazil","Buddha's Blessing","Butterfly Dancer","Contrarian","Crow","Crown Messenger","Demon King","Demon Wings","Destructive Impulses","Dribbler","Easter","Emperor","Genius","Godspeed","Homeless Man","Ice","King's Authority","Lightning","Magician Flow","Master Of All Trades","Monster","Puzzle","Singularity","Snake","Spade","Spain","Stealth","Target Man","Trap","Wild Card"].map(name=>Object.freeze({name,id:slug(name)})));
export const SECTIONS=Object.freeze([["Home","/"],["Styles","/styles/"],["Flows","/flows/"],["Abilities","/abilities/"],["Evolutions","/evolutions/"],["Progression","/progression/"],["Style mastery","/mastery/"],["Game mechanics","/mechanics/"],["Patch notes and updates","/updates/"],["Codes","/codes/"],["Cosmetics","/cosmetics/"],["Guides and counterplay","/guides/"],["Tech rules","/tech/"],["Server finder","/servers/"],["Custom matches","/servers/customs/"],["Support","/tech/#support"]].map(([name,url])=>({name,url,kind:'Section'})));
export const SEARCH_INDEX=Object.freeze([...SECTIONS,...STYLES_WIKI.map(s=>({name:s.name,url:'/styles/'+s.id+'/',kind:'Style',aliases:s.nel||s.id==='aiku'?'NEL '+s.name:''})),...FLOWS.map(s=>({name:s.name,url:'/flows/'+s.id+'/',kind:'Flow'}))]);
export function searchWiki(query=''){const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return SEARCH_INDEX.filter(item=>terms.every(t=>[item.name,item.kind,item.aliases||''].join(' ').toLowerCase().includes(t)));}
