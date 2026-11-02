import { POLICY, TECHS, STYLES, STYLE_GROUPS, GENERAL, ALL_STYLE_NAMES, STATUS, videoUrl, slug } from './data.js';
import { VIDEOS } from './videos.js';

const $ = id => document.getElementById(id);
const cardRoot=$('style-grid');
const entriesRoot=$('tech-entries');
const search=$('search');
const urlParams=new URLSearchParams(location.search);
const nameForSlug=new Map(ALL_STYLE_NAMES.map(name=>[slug(name),name]));
const GROUP_IDS=new Map(STYLES.map(style=>[style.name,style.groupLabel]));
const DEFAULT_STYLE='Nagi';

let selectedStyle=nameForSlug.get(urlParams.get('style'))||DEFAULT_STYLE;
let selectedFilter='all';
let query='';
let highlightTech=urlParams.get('tech')||'';
const order=['allowed','disallowed','punishable'];

const make=(tag,className='',text)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined&&text!==null)el.textContent=String(text);
  return el;
};
const itemsFor=name=>TECHS.filter(tech=>tech.styles.includes(name));
const countsFor=name=>{
  const items=itemsFor(name);
  return {all:items.length,allowed:items.filter(i=>i.status==='allowed').length,disallowed:items.filter(i=>i.status==='disallowed').length,punishable:items.filter(i=>i.status==='punishable').length};
};
function matchingStyles(term){
  return ALL_STYLE_NAMES.filter(name=>{
    if(!term)return true;
    if(name.toLowerCase().includes(term))return true;
    return itemsFor(name).some(item=>[item.name,item.status,...item.styles].join(' ').toLowerCase().includes(term));
  });
}
function styleUrl(name,techId=''){
  const url=new URL(location.href);
  url.searchParams.set('style',slug(name));
  if(techId)url.searchParams.set('tech',techId);
  else url.searchParams.delete('tech');
  url.hash='tech-list';
  return url.toString();
}
async function copyText(text,button,label='Copied!'){
  try{
    if(!navigator.clipboard?.writeText)throw Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text);
    const old=button.textContent;
    button.textContent=label;
    setTimeout(()=>{if(button.isConnected)button.textContent=old},1400);
  }catch{
    window.prompt('Copy this link or channel ID:',text);
  }
}
function tileFor(name){
  const count=countsFor(name),button=make('button','style-tile');
  button.type='button';
  button.dataset.style=slug(name);
  button.setAttribute('aria-pressed',String(name===selectedStyle));
  button.setAttribute('aria-label',name+', '+count.all+' documented entries');
  button.append(make('span','tile-name',name));
  const foot=make('span','tile-foot');
  if(!count.all)foot.append(make('span','count-pill neutral','No entries'));
  else for(const key of order)if(count[key])foot.append(make('span','count-pill '+key,count[key]+' '+(key==='allowed'?'allowed':key==='disallowed'?'banned':'bug')));
  button.append(foot);
  button.addEventListener('click',()=>selectStyle(name,true));
  return button;
}
function addStyleGroup(label,names){
  if(!names.length)return;
  const section=make('section','style-group');
  const heading=make('div','group-heading');
  heading.append(make('h3','',label),make('small','',names.length+' style'+(names.length===1?'':'s')));
  section.append(heading);
  const grid=make('div','style-grid');
  for(const name of names)grid.append(tileFor(name));
  section.append(grid);cardRoot.append(section);
}
function renderDirectory(){
  const matches=new Set(matchingStyles(query));
  cardRoot.replaceChildren();
  $('style-empty').hidden=matches.size!==0;
  if(matches.has(GENERAL))addStyleGroup('Shared / Cross-style',[GENERAL]);
  for(const group of STYLE_GROUPS){
    const names=group.names.filter(name=>matches.has(name));
    addStyleGroup(group.label,names);
  }
  $('clear-search').hidden=!search.value;
}
function updateActiveTile(){
  cardRoot.querySelectorAll('.style-tile').forEach(tile=>{
    tile.setAttribute('aria-pressed',String(tile.dataset.style===slug(selectedStyle)));
  });
}
function entryCard(item,index){
  const card=make('article','tech-entry');
  card.id='tech-'+item.id;
  if(item.id===highlightTech)card.classList.add('is-linked');
  const top=make('div','tech-entry-top');
  top.append(make('span','entry-status '+item.status,STATUS[item.status].name),
             make('span','entry-number',String(index+1).padStart(2,'0')));
  card.append(top,make('h3','',item.name));
  const related=item.styles.filter(name=>name!==selectedStyle);
  if(related.length)card.append(make('div','entry-meta','Also listed under: '+related.join(', ')));
  else if(selectedStyle===GENERAL)card.append(make('div','entry-meta','General gameplay / multiple styles'));
  else card.append(make('div','entry-meta','Style: '+selectedStyle));
  if(item.note)card.append(make('p','entry-meta',item.note));
  const foot=make('div','entry-footer');
  const youtube=videoUrl(VIDEOS[item.id] || item.video);
  if(youtube){
    const link=make('a','video-link','▶ Watch example ↗');
    link.href=youtube;link.target='_blank';link.rel='noopener noreferrer';
    link.title='Watch video on YouTube';
    foot.append(link);
  }else foot.append(make('span','no-video','▶ Clip not added yet'));
  const share=make('button','copy-tech','Copy link ↗');
  share.type='button';
  share.setAttribute('aria-label','Copy link to '+item.name);
  share.addEventListener('click',()=>copyText(styleUrl(selectedStyle,item.id),share));
  foot.append(share);card.append(foot);
  return card;
}
function renderDetail(){
  const group=selectedStyle===GENERAL?'SHARED / CROSS-STYLE':GROUP_IDS.get(selectedStyle)?.toUpperCase()||'STYLE GUIDE';
  $('active-style-group').textContent=group;
  $('active-style-title').textContent=selectedStyle;
  $('active-style-hint').textContent=selectedStyle===GENERAL
    ?'Rules involving shared mechanics, global actions, or unspecified style attribution.'
    :'Only entries explicitly associated with this style in the supplied rules. Variants are not automatically included.';
  const all=itemsFor(selectedStyle);
  const count=countsFor(selectedStyle);
  for(const key of ['all',...order])$('count-'+key).textContent=String(count[key]);
  const styleMatches=selectedStyle.toLowerCase().includes(query);
  const filtered=all.filter(item=>(selectedFilter==='all'||item.status===selectedFilter)
    &&(!query||styleMatches||item.name.toLowerCase().includes(query)||item.status.includes(query)));
  filtered.sort((a,b)=>order.indexOf(a.status)-order.indexOf(b.status)||a.name.localeCompare(b.name));
  entriesRoot.replaceChildren(...filtered.map(entryCard));
  $('tech-empty').hidden=filtered.length!==0;
  const title=$('tech-empty').querySelector('strong');
  title.textContent=!all.length?'No documented entries for this style yet.':'No entries match the selected filter.';
  for(const button of document.querySelectorAll('.filters [data-filter]')){
    button.setAttribute('aria-pressed',String(button.dataset.filter===selectedFilter));
  }
  updateActiveTile();
}
function selectStyle(name,scroll=false,push=true){
  if(!ALL_STYLE_NAMES.includes(name))return;
  selectedStyle=name;
  selectedFilter='all';
  highlightTech='';
  if(push){
    const url=new URL(location.href);
    url.searchParams.set('style',slug(name));
    url.searchParams.delete('tech');
    url.hash=scroll?'tech-list':url.hash;
    history.pushState(null,'',url);
  }
  renderDirectory();
  renderDetail();
  if(scroll)$('tech-list').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
function syncRoute(){
  const params=new URLSearchParams(location.search);
  const requested=nameForSlug.get(params.get('style'));
  const linked=params.get('tech')||'';
  const entry=TECHS.find(t=>t.id===linked);
  selectedStyle=requested||entry?.styles[0]||DEFAULT_STYLE;
  selectedFilter='all';highlightTech=entry?.styles.includes(selectedStyle)?linked:'';
  renderDirectory();renderDetail();
  if(highlightTech&&location.hash==='#tech-list'){
    requestAnimationFrame(()=>document.getElementById('tech-'+highlightTech)?.scrollIntoView({block:'center'}));
  }
}
function init(){
  $('style-count').textContent=STYLES.length.toLocaleString();
  $('tech-count').textContent=TECHS.length.toLocaleString();
  $('allowed-count').textContent=TECHS.filter(t=>t.status==='allowed').length.toLocaleString();
  $('restricted-count').textContent=TECHS.filter(t=>t.status!=='allowed').length.toLocaleString();

  // Unknown technique IDs cannot masquerade as validated policy entries.
  for(const t of TECHS){
    if(!ALL_STYLE_NAMES.length||!STATUS[t.status]||!t.styles.every(s=>ALL_STYLE_NAMES.includes(s)))
      console.warn('Invalid tech catalog item:',t.id);
  }

  search.addEventListener('input',()=>{
    query=search.value.trim().toLowerCase();
    renderDirectory();
    renderDetail();
  });
  $('clear-search').addEventListener('click',()=>{
    search.value='';query='';renderDirectory();renderDetail();search.focus();
  });
  document.querySelectorAll('.filters [data-filter]').forEach(button=>{
    button.addEventListener('click',()=>{
      selectedFilter=button.dataset.filter;
      renderDetail();
    });
  });
  $('share-style').addEventListener('click',event=>copyText(styleUrl(selectedStyle),event.currentTarget));
  document.querySelectorAll('.copy-channel').forEach(button=>{
    button.addEventListener('click',()=>copyText(button.dataset.copy,button,'Channel ID copied!'));
  });
  window.addEventListener('popstate',syncRoute);
  syncRoute();
}
init();
