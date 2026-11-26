import {matchesQuery,STYLES_WIKI,FLOWS} from './content.mjs?v=4';
const $=s=>document.querySelector(s);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const link=(text,href)=>{const n=node('a',text);n.href=href;return n;};
const note='These are dated official announcements, not live-tested current stats. Later patches may change their contents.';
const source=r=>{const a=link((r.sourceLabel||'Discord source')+' ↗',r.source);a.target='_blank';a.rel='noopener noreferrer';return a;};
const meta=r=>{const p=node('div',null,'announcement-meta');p.append(node('time',r.date),document.createTextNode(' · '),source(r));return p;};
const titleFor=(slug,list)=>list.find(x=>x.id===slug)?.name||slug;
function card(r,showTargets=false){
 const section=node('article',null,'announcement-card');
 section.append(node('h3',r.title),meta(r),node('p',r.text));
 if(r.type)section.append(node('span',r.type,'announcement-tag'));
 if(showTargets){const chips=node('div',null,'announcement-links');
  for(const id of r.styles||[])chips.append(link(titleFor(id,STYLES_WIKI),'/styles/'+id+'/'));
  for(const id of r.flows||[])chips.append(link(titleFor(id,FLOWS),'/flows/'+id+'/'));
  if(chips.childNodes.length)section.append(chips);
 }
 if(r.balanceChanges?.length){
  const details=node('details',null,'og-balance-details');
  details.append(node('summary','Announced balance adjustments ('+r.balanceChanges.length+')'),node('p',r.balanceNotice,'wiki-muted'));
  const groups=new Map();for(const c of r.balanceChanges){if(!groups.has(c.style))groups.set(c.style,[]);groups.get(c.style).push(c);}
  for(const [style,items] of groups){
   const group=node('section',null,'og-balance-group'),h4=node('h4');h4.append(link(titleFor(style,STYLES_WIKI),'/styles/'+style+'/'));group.append(h4);
   const list=node('ul',null,'og-balance-list');
   for(const c of items){const li=node('li');li.append(node('span',c.kind,'og-kind'),document.createTextNode(' '),node('strong',c.move+': '),document.createTextNode(c.description));list.append(li);}
   group.append(list);details.append(group);
  }
  section.append(details);
 }
 if(r.shop?.length||r.bundles?.length){
  const extras=node('div',null,'og-extras');
  if(r.shop?.length)extras.append(node('p','Limited shop: '+r.shop.join(' · ')));
  if(r.bundles?.length)extras.append(node('p','Bundles: '+r.bundles.join(' · ')));
  section.append(extras);
 }
 return section;
}
function ogPatch(og,style=null){
 const items=style?og.changes.filter(c=>c.style===style):og.changes;
 return {id:og.id,date:og.date,title:og.title,type:'Event',text:style?'OG update announcement affecting this style. Live values remain unverified.':og.summary,source:og.source,sourceLabel:og.sourceLabel,styles:style?[]:[...new Set(items.map(c=>c.style))],flows:[],balanceChanges:items,balanceNotice:og.balanceNotice,shop:style?[]:og.shop,bundles:style?[]:og.bundles};
}
function block(root,heading,rows){if(!rows?.length)return;const section=node('section',null,'wiki-details-section');section.append(node('h2',heading));for(const row of rows)section.append(card(row));root.append(section);}
function table(headers,rows){const wrap=node('div',null,'wiki-table-scroll');const t=node('table',null,'wiki-table announcement-table');const head=node('thead'),hr=node('tr');for(const h of headers)hr.append(node('th',h));head.append(hr);t.append(head);const body=node('tbody');for(const r of rows){const tr=node('tr');for(const cell of r){const td=node('td');if(cell instanceof Node)td.append(cell);else td.textContent=cell||'Not specified';tr.append(td);}body.append(tr);}t.append(body);wrap.append(t);return wrap;}
function filterList(root,rows,{searchText,types=null,renderItem,unit='entries',queryPlaceholder='Search announcements…',pageSize=20}){
 const controls=node('div',null,'wiki-filters'),label=node('label','Search'),q=node('input');q.type='search';q.placeholder=queryPlaceholder;q.value=new URLSearchParams(location.search).get('q')||'';label.append(q);controls.append(label);
 let select=null;if(types){const l=node('label','Category');select=node('select');const all=node('option','All categories');all.value='';select.append(all);for(const type of [...new Set(types)].sort()){const o=node('option',type);o.value=type;select.append(o);}l.append(select);controls.append(l);const v=new URLSearchParams(location.search).get('type');if([...select.options].some(o=>o.value===v))select.value=v;}
 const status=node('p',null,'wiki-muted');status.setAttribute('role','status');const results=node('div',null,'announcement-results');const more=node('button','Load more','kb-clear-filter');more.type='button';
 root.replaceChildren(controls,status,results,more);let shown=pageSize;
 function render(reset=true){if(reset)shown=pageSize;const selected=rows.filter(r=>(!select?.value||r.type===select.value)&&matchesQuery(searchText(r),q.value));results.replaceChildren();for(const r of selected.slice(0,shown))results.append(renderItem(r));status.textContent='Showing '+Math.min(shown,selected.length)+' of '+selected.length+' '+unit+(selected.length===rows.length?'':' ('+rows.length+' total)');more.hidden=shown>=selected.length;if(!selected.length)results.append(node('p','No matching entries. Try another search.','wiki-muted'));}
 function changed(){const url=new URL(location.href);q.value.trim()?url.searchParams.set('q',q.value.trim()):url.searchParams.delete('q');select?.value?url.searchParams.set('type',select.value):url.searchParams.delete('type');history.replaceState(history.state,'',url);render();}
 q.addEventListener('input',changed);select?.addEventListener('change',changed);more.addEventListener('click',()=>{shown+=pageSize;render(false);});render();
}
function renderArchive(root,rows){filterList(root,rows,{searchText:r=>[r.date,r.title,r.type,r.text,...r.styles.map(id=>titleFor(id,STYLES_WIKI)),...r.flows.map(id=>titleFor(id,FLOWS)),...(r.balanceChanges||[]).flatMap(c=>[c.move,c.description])].join(' '),types:rows.map(r=>r.type),renderItem:r=>card(r,true),unit:'updates'});}
function renderCodes(root,rows){filterList(root,rows,{searchText:r=>[r.code,r.reward,r.date].join(' '),unit:'announced codes',queryPlaceholder:'Search code or reward…',renderItem:r=>{const a=node('article',null,'announcement-card code-entry');const heading=node('h3',r.code);const copy=node('button','Copy code','kb-clear-filter');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(r.code);copy.textContent='Copied';}catch{copy.textContent='Select code to copy';}});a.append(heading,node('p',r.reward),node('p','Redemption status: unverified','wiki-muted'),meta(r),copy);return a;},pageSize:30});}
function renderAbilityIndex(root,rows){root.replaceChildren();const wrap=node('div',null,'kb-categories');for(const r of rows.sort((a,b)=>titleFor(a.slug,STYLES_WIKI).localeCompare(titleFor(b.slug,STYLES_WIKI)))){const a=link('', '/styles/'+r.slug+'/#announced-abilities');a.className='kb-category';a.append(node('strong',titleFor(r.slug,STYLES_WIKI)),node('span',r.count+' documented abilities · latest '+r.date));wrap.append(a);}root.append(node('p',note,'wiki-muted'),wrap);}
function updateStyle(root,data){if(!root)return;const count=data.abilities.length+data.facts.length+data.history.length;if(!count)return;
 const sub=$('#wiki-style-subtitle');if(sub)sub.textContent=sub.textContent.replace('Article in development','Announcement archive');
 const status=[...document.querySelectorAll('.kb-infobox dt')].find(x=>x.textContent==='Article status');if(status?.nextElementSibling)status.nextElementSibling.textContent='Historical sources available';
 function sectionByName(name){return [...root.querySelectorAll(':scope > .wiki-details-section')].find(s=>s.querySelector('h2')?.textContent===name);}
 const overview=sectionByName('Overview');if(overview){overview.replaceChildren(node('h2','Source coverage'),node('p',note),node('p',data.abilities.length+' announced ability records · '+data.history.length+' linked updates. This is not a complete current moveset.','wiki-muted'));}
 if(data.abilities.length){const section=sectionByName('Abilities')||node('section');section.id='announced-abilities';section.replaceChildren(node('h2','Announced abilities'),node('p','Inputs and conditions as described on the listed dates. Cooldowns, ranges and i-frames not explicitly recorded remain unknown.','wiki-muted'));section.append(table(['Kit','Ability','Input','Conditions','Announced','Source'],data.abilities.map(r=>[r.kit,r.name,r.input,r.condition,r.date,source(r)])));if(!section.parentNode)root.append(section);}
 const history=sectionByName('Patch history');if(history&&data.history.length){history.replaceChildren(node('h2','Patch history'),node('p','Newest announcements first. Some entries mention several styles.','wiki-muted'));for(const r of data.history)history.append(card(r));}
 if(data.facts.length){const details=node('section',null,'wiki-details-section');details.append(node('h2','Documented changes and interactions'));for(const r of data.facts)details.append(card(r));if(history)root.insertBefore(details,history);else root.append(details);}
 if(location.hash==='#announced-abilities')requestAnimationFrame(()=>$('#announced-abilities')?.scrollIntoView());
}
function updateFlow(root,data){if(!root||!data.history.length&&!data.facts.length)return;root.replaceChildren(node('h2','Announcement archive'),node('p',note,'wiki-muted'));block(root,'Recorded effects and changes',data.facts);block(root,'Patch history',data.history);if(!data.facts.length)root.append(node('p','Detailed effects and current rarity are not established by these records.','wiki-muted'));}
export async function hydrateAnnouncements(){
 const route=location.pathname.replace(/^\/|\/$/g,'');
 let target=$('#wiki-announcement-list')||$('#wiki-patch-list');
 const style=/^styles\/[a-z0-9-]+$/.test(route),flow=/^flows\/[a-z0-9-]+$/.test(route);
 if(style)target=$('#wiki-style-detail');if(flow)target=$('.kb-article article');if(!target)return;
 const known=['updates','codes','abilities','mechanics','progression','evolutions','cosmetics'];if(!style&&!flow&&!known.includes(route))return;
 try{
 const [response,og]=await Promise.all([fetch('/wiki/records/'+route+'.json?v=1'),fetch('/wiki/og-update.json?v=1').then(r=>r.ok?r.json():null).catch(()=>null)]);
 if(!response.ok)throw Error('Archive unavailable');
 const data=await response.json();
 if(style){
  const slug=route.split('/')[1],history=og?.changes?.some(c=>c.style===slug)?[ogPatch(og,slug),...data.history]:data.history;
  updateStyle(target,{...data,history});
  import('./technical-abilities.mjs?v=7').then(m=>m.renderTechnicalAbilities(target,slug)).catch(()=>{});
  import('./tested-ui.mjs?v=6').then(m=>m.renderTestedAbilities(target,slug,history)).catch(()=>{});
 }else if(flow)updateFlow(target,data);
 else if(route==='updates')renderArchive(target,og?[ogPatch(og),...data]:data);
 else if(route==='codes'){const fresh=og?og.codes.map(c=>({...c,id:og.id,date:og.date,source:og.source,sourceLabel:og.sourceLabel})):[];renderCodes(target,[...fresh,...data]);}
 else if(route==='abilities')renderAbilityIndex(target,data);
 else if(route==='cosmetics'){
  const extra=og?{id:og.id,date:og.date,title:'BL:R OG limited shop and bundle',text:[...og.shop,...og.bundles].join(', ')+'.',source:og.source,sourceLabel:og.sourceLabel,kind:'cosmetics',targets:[]}:null;
  target.replaceChildren(node('p',note,'wiki-muted'));block(target,'Documented announcements',extra?[extra,...data]:data);
 }else{target.replaceChildren(node('p',note,'wiki-muted'));block(target,'Documented announcements',data);}
 }catch{if(!style&&!flow)target.replaceChildren(node('p','The announcement archive could not be loaded. Reload to retry.','wiki-muted'));else target.prepend(node('p','Announcement records could not be loaded. Reload to retry.','wiki-muted'));}
 if(style||flow||['mechanics','progression','evolutions'].includes(route))import('./gameplay-reference.mjs?v=3').then(m=>{if(style)m.renderStyleReference(target,route.split('/')[1]);else if(flow)m.renderFlowReference(target,route.split('/')[1]);else m.renderMechanicsReference(target,route);}).catch(console.error);
 if(style||flow||['mechanics','progression','evolutions'].includes(route))import('./community-ui.mjs?v=1').then(m=>m.addCommunityReferences(target,route)).catch(()=>{});
}
