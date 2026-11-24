import {FIELDS,needsRetest,wikiRequest} from './tested-data.mjs?v=2';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={input:'Input',cooldown:'Cooldown',playerIframes:'Player i-frames',ballIframes:'Ball i-frames',duration:'Duration',range:'Range',chargeTime:'Charge time',condition:'Conditions',effect:'Effects',notes:'Notes'};
const seconds=new Set(['cooldown','playerIframes','ballIframes','duration','chargeTime']);
const groups=[['base','Base'],['awakening','Awk'],['chemical','Chem']];
export function kitGroup(kit){const k=String(kit||'').toLowerCase().trim();if(/chem|reaction|synergy/.test(k))return 'chemical';if(/awak|\bawk\b/.test(k))return 'awakening';if(/base|normal|default/.test(k))return 'base';return 'other';}
const css=`
#tested-abilities .tested-tabs{display:flex;gap:4px;padding:4px;border:1px solid #334153;border-radius:9px;background:#111923;margin:0 0 12px}
#tested-abilities .tested-tab{flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 5px;border:1px solid transparent;border-radius:6px;background:transparent;color:#a9b9cc;font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;white-space:nowrap}
#tested-abilities .tested-tab[aria-selected=true]{background:#25384c;border-color:#41617c;color:#e5f1ff}
#tested-abilities .tested-tab:focus-visible{outline:2px solid #8acbff;outline-offset:2px}
#tested-abilities .tested-tab-count{font-size:.72rem;opacity:.8;font-weight:400}
#tested-abilities .tested-list{display:block}
#tested-abilities .tested-column{min-width:0;display:flex;flex-direction:column;gap:8px}
#tested-abilities .tested-column[hidden]{display:none!important}
#tested-abilities .tested-empty{margin:0;padding:12px;border:1px dashed #334153;border-radius:7px;font-size:.85rem;color:#a9b9cc}
#tested-abilities .tested-column > .tested-card{grid-area:auto!important;position:static!important;display:block;padding:12px 14px;margin:0;min-width:0;width:100%}
@media(max-width:400px){#tested-abilities .tested-tab{font-size:.8rem;gap:4px}}
#tested-abilities .tested-header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px}
#tested-abilities .tested-header h3{font-size:1rem;line-height:1.35;margin:0}
#tested-abilities .tested-kit,#tested-abilities .tested-date{font-size:.75rem;line-height:1.4;color:#acbbce}
#tested-abilities .tested-date{margin:4px 0 10px}
#tested-abilities .tested-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,112px),1fr));gap:6px;margin:0}
#tested-abilities .tested-stat{background:#111923;border:1px solid #2d3949;border-radius:6px;padding:7px 9px;min-width:0}
#tested-abilities dt{font-size:.72rem;line-height:1.35;color:#acbbce;margin:0 0 3px}
#tested-abilities dd{font-size:.95rem;line-height:1.4;font-weight:600;margin:0;color:#edf4ff;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#tested-abilities .tested-text{display:grid;gap:5px;margin:9px 0 0}
#tested-abilities .tested-detail{display:grid;grid-template-columns:minmax(76px,auto) minmax(0,1fr);gap:8px;align-items:baseline}
#tested-abilities .tested-detail dt,#tested-abilities .tested-detail dd{font-size:.82rem;margin:0;white-space:pre-wrap}
#tested-abilities .tested-detail dd{font-weight:400}
#tested-abilities .tested-evidence{display:inline-block;font-size:.78rem;margin-top:8px}
#tested-abilities .tested-review{color:#f8ce83}
@media(max-width:400px){#tested-abilities .tested-card{padding:10px}#tested-abilities .tested-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
export async function renderTestedAbilities(root,slug,history){
 const section=el('section',null,'wiki-details-section');section.id='tested-abilities';const style=el('style',css);section.append(style,el('h2','Manually tested abilities'));
 const note=el('p','Loading tested values…','wiki-muted');section.append(note);const anchor=[...root.querySelectorAll(':scope > .wiki-details-section')].find(s=>['Announced abilities','Abilities','Patch history'].includes(s.querySelector('h2')?.textContent));root.insertBefore(section,anchor||null);
 const refresh=el('button','Refresh values','kb-clear-filter');refresh.type='button';section.querySelector('h2').append(refresh);
 const tabs=el('div',null,'tested-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Ability kit');tabs.hidden=true;
 const list=el('div',null,'tested-list');section.append(tabs,list);
 let pending=false,lastFetch=0,activeKit='base';
 function selectKit(id,focus=false){
  activeKit=id;
  for(const button of tabs.querySelectorAll('[role=tab]')){const selected=button.dataset.kit===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;if(selected&&focus)button.focus();}
  for(const panel of list.children)panel.hidden=panel.dataset.kit!==id;
 }
 tabs.addEventListener('keydown',e=>{
  const buttons=[...tabs.querySelectorAll('[role=tab]')];const i=buttons.indexOf(e.target);if(i<0)return;
  let next;if(e.key==='ArrowRight')next=(i+1)%buttons.length;else if(e.key==='ArrowLeft')next=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;
  e.preventDefault();selectKit(buttons[next].dataset.kit,true);
 });
 async function reload(){
 if(pending||!section.isConnected)return;pending=true;refresh.disabled=true;refresh.textContent='Refreshing…';
 try{
 const {entries}=await wikiRequest('/styles/'+slug+'?fresh='+Date.now());if(!Array.isArray(entries))throw Error();
 list.replaceChildren();lastFetch=Date.now();
 note.textContent=entries.length?entries.length+' tested '+(entries.length===1?'ability':'abilities')+'. “Review after patch” indicates possible changes.':'No manually tested values published yet.';
 const columns=new Map();const fragment=document.createDocumentFragment(),tabFragment=document.createDocumentFragment();
 const kits=[...groups,...(entries.some(r=>kitGroup(r.kit)==='other')?[['other','Other']]:[])];
 if(!kits.some(([id])=>id===activeKit))activeKit='base';
 for(const [id,title] of kits){
  const col=el('div',null,'tested-column');col.dataset.kit=id;col.id='tested-panel-'+id;col.setAttribute('role','tabpanel');col.setAttribute('aria-labelledby','tested-tab-'+id);
  const count=entries.filter(r=>kitGroup(r.kit)===id).length;
  const button=el('button',title,'tested-tab');button.type='button';button.id='tested-tab-'+id;button.dataset.kit=id;button.setAttribute('role','tab');button.setAttribute('aria-controls',col.id);button.append(el('span',String(count),'tested-tab-count'));button.addEventListener('click',()=>selectKit(id));tabFragment.append(button);
  if(!count)col.append(el('p','No tested abilities yet.','tested-empty'));
  columns.set(id,col);fragment.append(col);
 }
 const order={C:0,V:1,B:2,G:3};const rank=r=>order[String(r.input||'').trim().toUpperCase()]??99;
 for(const r of [...entries].sort((a,b)=>rank(a)-rank(b)||String(a.name).localeCompare(String(b.name)))){
  const card=el('article',null,'announcement-card tested-card'),header=el('div',null,'tested-header');header.append(el('h3',r.name),el('span',r.kit,'tested-kit'));card.append(header);
  const review=needsRetest(r,history),date=el('p','Tested '+r.testedOn,'tested-date');if(review)date.append(el('span',' · Review after patch','tested-review'));card.append(date);
  const stats=el('dl',null,'tested-stats'),details=el('dl',null,'tested-text');
  for(const [key,label,type] of FIELDS.filter(([k])=>!['name','kit','testedOn','evidence'].includes(k))){
   const value=r[key];if(value===null||value===undefined||value==='')continue;
   const long=type==='textarea',row=el('div',null,long?'tested-detail':'tested-stat');
   const formatted=String(value)+(seconds.has(key)?' s':key==='range'?' m':'');row.append(el('dt',labels[key]||label),el('dd',formatted));(long?details:stats).append(row);
  }
  if(stats.childElementCount)card.append(stats);if(details.childElementCount)card.append(details);
  if(r.evidence){try{const u=new URL(r.evidence);if(u.protocol==='https:'){const a=el('a','Testing evidence ↗','tested-evidence');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}}catch{}}
  columns.get(kitGroup(r.kit)).append(card);
 }
 list.append(fragment);tabs.replaceChildren(tabFragment);tabs.hidden=false;selectKit(activeKit);
 }catch{note.textContent=list.childElementCount?'Refresh failed. Showing previously loaded values.':'Tested values are currently unavailable. Announcement history below remains available.';}
 finally{pending=false;refresh.disabled=false;refresh.textContent='Refresh values';}
 }
 refresh.addEventListener('click',reload);
 const refreshIfStale=()=>{if(!document.hidden&&Date.now()-lastFetch>3000)reload()};
 window.addEventListener('focus',refreshIfStale);
 document.addEventListener('visibilitychange',refreshIfStale);
 window.addEventListener('pageshow',event=>{if(event.persisted)reload()});
 await reload();
}
