import {STYLES_WIKI,RARITIES,ARTICLES,PATCHES,PRACTICE,ROSTER_AS_OF,filterStyles,byId,searchWiki} from './content.mjs';
// One lightweight icon renderer for existing static wiki cards and article infoboxes.
// The accessible name remains in the surrounding link or heading.
import {iconSpec,ICON_FONT_FAMILY} from './icons.mjs';
const $=id=>document.getElementById(id);
function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
function link(label,url){const a=el('a',label);a.href=url;return a;}
function source(record){if(!record.source)return null;try{const u=new URL(record.source);if(u.protocol!=='https:')return null;const a=link('Source ↗',u.href);a.rel='noopener noreferrer';return a;}catch{return null;}}
function renderRecords(node,records,empty){if(!records?.length){node.append(el('p',empty,'wiki-muted'));return;}for(const record of records){const item=el('div',null,'wiki-details-section');item.append(el('strong',record.title),el('p',record.text));if(record.verified)item.append(el('small','Verified: '+record.verified+' · '));const a=source(record);if(a)item.append(a);node.append(item);}}
function section(root,title,records,empty){const s=el('div',null,'wiki-details-section');s.append(el('h2',title));renderRecords(s,records,empty);root.append(s);}
function renderAbilities(root,abilities){const s=el('div',null,'wiki-details-section');s.append(el('h2','Abilities'));if(!abilities?.length){s.append(el('p','No verified ability details yet. Inputs, cooldowns, i-frames, conditions and ranges will be added after testing.','wiki-muted'));}else{const wrap=el('div',null,'wiki-table-scroll'),table=el('table',null,'wiki-table');const keys=['name','kit','input','cooldown','condition','range','iframes'];const row=el('tr');for(const k of ['Ability','Kit','Input','Cooldown','Conditions','Range','I-frames','Source'])row.append(el('th',k));const head=el('thead');head.append(row);table.append(head);const body=el('tbody');for(const ability of abilities){const tr=el('tr');for(const k of keys)tr.append(el('td',ability[k]??'Unverified'));const td=el('td'),a=source(ability);td.append(a??el('span','Not supplied'));tr.append(td);body.append(tr);}table.append(body);wrap.append(table);s.append(wrap);}root.append(s);}
function mastery(root,style){const s=el('div',null,'wiki-details-section');s.append(el('h2','Practice mastery'),el('p','Personal checklist, not an in-game rank. Saved on this browser only.'));const key='blr-wiki-mastery-v1:'+style.id;let done=new Set();try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))done=new Set(saved.filter(x=>PRACTICE.some(p=>p.id===x)));}catch{}const progress=el('progress',null,'wiki-progress');progress.max=PRACTICE.length;progress.setAttribute('aria-label','Practice mastery progress');const label=el('p');const update=()=>{progress.value=done.size;label.textContent=done.size+' / '+PRACTICE.length+' practice goals complete';};s.append(progress,label);for(const task of PRACTICE){const l=el('label',null,'wiki-check'),c=el('input');c.type='checkbox';c.checked=done.has(task.id);c.addEventListener('change',()=>{if(c.checked)done.add(task.id);else done.delete(task.id);try{localStorage.setItem(key,JSON.stringify([...done]));}catch{}update();});l.append(c,el('span',task.label));s.append(l);}update();root.append(s);}
function showDetail(style){const d=$('wiki-style-detail');d.replaceChildren();if($('wiki-directory'))$('wiki-directory').hidden=true;d.hidden=false;$('wiki-style-title').textContent=style.name;document.title=style.name+' · BL:R Wiki';$('wiki-style-subtitle').textContent=style.groupLabel+' · Article in development';d.append(link('← All styles','/styles/'),el('p','Roster snapshot: '+ROSTER_AS_OF+(style.nel?' · NEL variant grouped with base style':''),'wiki-muted'));const article=ARTICLES[style.id]||{};section(d,'Overview',article.overview,'Gameplay overview has not been verified yet.');renderAbilities(d,article.abilities);section(d,'Flows & evolutions',article.evolutions,'No verified unlock requirements or kit changes yet.');section(d,'Progression',article.progression,'No verified in-game progression requirements yet.');mastery(d,style);section(d,'Advanced mastery',article.mastery,'No reviewed style-specific guide yet.');section(d,'Counterplay & goalkeeping',article.counterplay,'No reviewed counterplay guide yet.');section(d,'Patch history',article.history,'No sourced patch history for this style yet.');const rules=el('div',null,'wiki-details-section');rules.append(el('h2','Tech rules'),el('p','The separate directory contains the community moderation snapshot. Unlisted techniques are not automatically allowed.'),link('Open Tech Rules ↗','/tech/'));d.append(rules);}
const params=new URLSearchParams(location.search);
if($('wiki-style-grid')){const style=byId(params.get('style'));if(style)showDetail(style);else{const search=$('wiki-style-search'),rarity=$('wiki-rarity'),grid=$('wiki-style-grid');for(const r of RARITIES){const o=el('option',r.label);o.value=r.id;rarity.append(o);}search.value=params.get('q')||'';const requested=params.get('rarity');if(RARITIES.some(r=>r.id===requested))rarity.value=requested;const render=()=>{const found=filterStyles(search.value,rarity.value);grid.replaceChildren();$('wiki-result-count').textContent=found.length+' of '+STYLES_WIKI.length+' styles';for(const s of found){const a=link('','/styles/'+encodeURIComponent(s.id)+'/');a.append(el('small',s.groupLabel+(s.nel?' · NEL':''),'wiki-badge'),el('strong',s.name),el('small',ARTICLES[s.id]?'View article ↗':'Profile • information pending ↗'));grid.append(a);}if(!found.length)grid.append(el('p','No styles match your search.','wiki-muted'));};search.addEventListener('input',render);rarity.addEventListener('change',render);if(params.has('style'))$('wiki-style-subtitle').textContent='Style not found. Browse the roster below.';render();}}
if($('wiki-patch-list'))renderRecords($('wiki-patch-list'),PATCHES,'No verified entries published.');
if($('wiki-ability-list')){const list=$('wiki-ability-list');for(const style of STYLES_WIKI){if(ARTICLES[style.id]?.abilities?.length)list.append(el('p'),link(style.name,'/styles/'+style.id+'/'));}}
if($('wiki-evolution-list')){const list=$('wiki-evolution-list');for(const style of STYLES_WIKI.filter(s=>s.nel)){const item=el('p');item.append(link(style.name+' / NEL ↗','/styles/'+style.id+'/'));list.append(item);}}

if($('wiki-style-detail')?.dataset.style){const s=byId($('wiki-style-detail').dataset.style);if(s)showDetail(s);}
if($('kb-directory')){const query=$('kb-filter'),rarity=$('kb-rarity'),groups=[...document.querySelectorAll('[data-roster-group]')],cards=[...document.querySelectorAll('#kb-directory .kb-tile')];const render=()=>{const term=query.value.trim().toLowerCase();let count=0;for(const c of cards){c.hidden=!(c.dataset.name.includes(term)&&(!rarity?.value||rarity.value===c.dataset.rarity));if(!c.hidden)count++;}for(const g of groups)g.hidden=!g.querySelector('.kb-tile:not([hidden])');$('kb-count').textContent=count+' entries';};query.value=params.get('q')||'';query.addEventListener('input',render);rarity?.addEventListener('change',render);render();}
if($('kb-search-results')){const q=params.get('q')||'';$('kb-search').value=q;const results=q.trim()?searchWiki(q):[];$('kb-search-count').textContent=q.trim()?results.length+' results for “'+q+'”':'Enter a search term.';for(const item of results){const a=link('',item.url);a.className='kb-category';a.append(el('strong',item.name),el('span',item.kind));$('kb-search-results').append(a);}}
if(location.pathname==='/'&&['#stats','#tools','#discord'].includes(location.hash)){const dest={'#stats':'https://n29.kz/blr-profile/','#tools':'https://n29.kz/creator/','#discord':'https://n29.kz/'}[location.hash];location.replace(dest);}

function renderWikiIcons(){
  const icons=[...document.querySelectorAll('.kb-icon')];
  if(!icons.length)return;
  const masters=[];
  // Measure the actual local font once per distinct line, not DOM dimensions.
  // CSS container units scale the result on viewport changes without observers.
  const ctx=document.createElement('canvas').getContext('2d');
  const widths=new Map();
  if(ctx)ctx.font='900 100px '+ICON_FONT_FAMILY;
  const measure=ctx?text=>{
    if(!widths.has(text))widths.set(text,ctx.measureText(text).width/100);
    return widths.get(text);
  }:undefined;
  for(const icon of icons){
    const owner=icon.closest('.kb-tile,.kb-infobox');
    if(!owner)continue;
    const name=owner.querySelector('.kb-tile strong,h2')?.textContent?.trim()||owner.querySelector('strong')?.textContent?.trim();
    if(!name)continue;
    const isFlow=icon.classList.contains('kb-flows')||owner.getAttribute('href')?.startsWith('/flows/')||location.pathname.startsWith('/flows/');
    const rarity=owner.dataset.rarity||owner.querySelector('dl dd')?.textContent?.trim().toLowerCase()||'';
    const nel=owner.querySelector('small')?.textContent?.includes('NEL shown')||[...owner.querySelectorAll('dd')].some(d=>d.textContent==='NEL variant');
    const spec=iconSpec(name,isFlow?'flow':'style',rarity,nel,measure);
    icon.removeAttribute('style');icon.classList.remove('kb-icon-missing');
    icon.dataset.palette=spec.palette;
    if(!isFlow)icon.classList.add('kb-styles');
    if(spec.master){icon.dataset.master='true';masters.push(icon);}
    const label=el('span',null,'kb-icon-label');
    for(const line of spec.lines)label.append(el('span',line,'kb-icon-line'));
    icon.style.setProperty('--icon-font',spec.font+'cqi');
    icon.replaceChildren(label);
  }
  // No fallback animation on older browsers and no timers or per-frame JavaScript.
  if(!masters.length||!('IntersectionObserver' in window))return;
  const visible=new Set();
  const sync=()=>{for(const icon of masters)icon.classList.toggle('kb-icon-visible',!document.hidden&&visible.has(icon));};
  const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting)visible.add(e.target);else visible.delete(e.target);}sync();},{threshold:0.01});
  masters.forEach(icon=>observer.observe(icon));
  document.addEventListener('visibilitychange',sync);
}
renderWikiIcons();
