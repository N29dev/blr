import {TECHS,STYLES,STYLE_GROUPS,GENERAL,STATUS,slug,videoUrl,canonicalStyle} from '../data.js';
import {VIDEOS} from '../videos.js';
import {RATING_FIELDS,TAG_GROUPS,validRating,overallRating} from '../ratings.js';

const API='https://glutony.scp343hey.workers.dev';
const $=id=>document.getElementById(id);
let adminKey='';
let overrides=[];
let catalog=[];
let selectedId=null;
let busy=false;
let selectedStyles=new Set();
const basicNames=[GENERAL,...STYLES.map(s=>s.name)];
const canonicalNames=styles=>[...new Set(styles.map(canonicalStyle).filter(Boolean))];
const idPattern=/^[a-z0-9][a-z0-9-]{1,70}$/;

const node=(tag,className='',text=null)=>{
  const result=document.createElement(tag);
  if(className)result.className=className;
  if(text!==null)result.textContent=text;
  return result;
};
function buildAssessmentEditor(){
  const ratings=$('rating-fields');
  for(const field of RATING_FIELDS){
    const label=node('label','rating-control');
    const name=node('span','rating-label',field.label+(field.optional?' · optional':''));
    const select=node('select');
    select.id='rating-'+field.id;
    const empty=node('option','','Not rated');empty.value='';select.append(empty);
    for(let i=1;i<=5;i++){
      const option=node('option','',String(i)+'/5');option.value=String(i);select.append(option);
    }
    select.addEventListener('change',updateOverallPreview);
    label.append(name,select,node('small','',field.hint));
    ratings.append(label);
  }
  const tags=$('entry-tag-picker');
  for(const group of TAG_GROUPS){
    const section=node('fieldset','tag-group');
    section.append(node('legend','',group.label));
    const choices=node('div','tag-options');
    for(const tag of group.tags){
      const label=node('label','tag-choice');
      const input=node('input');
      input.type='checkbox';input.value=tag;
      label.append(input,node('span','',tag));
      choices.append(label);
    }
    section.append(choices);tags.append(section);
  }
}
function readRatings(){
  const ratings={};
  for(const field of RATING_FIELDS){
    const value=$('rating-'+field.id).value;
    if(value!==''&&validRating(Number(value)))ratings[field.id]=Number(value);
  }
  return ratings;
}
function selectedTags(){
  return [...$('entry-tag-picker').querySelectorAll('input:checked')].map(input=>input.value);
}
function updateOverallPreview(){
  const overall=overallRating(readRatings());
  $('overall-preview').textContent=overall===null?'Overall: Not rated':'Overall: '+overall.toFixed(1)+'/5';
}
function fillAssessment(item){
  for(const field of RATING_FIELDS){
    const value=item.ratings?.[field.id];
    $('rating-'+field.id).value=validRating(value)?String(value):'';
  }
  const tags=new Set(item.tags||[]);
  $('entry-tag-picker').querySelectorAll('input').forEach(input=>{input.checked=tags.has(input.value);});
  $('entry-counterplay').value=item.counterplay||'';
  updateOverallPreview();
}
function feedback(id,message,kind=''){
  const el=$(id);
  el.textContent=message;
  el.className='admin-message '+kind;
}
async function request(path,options={},authorized=false){
  const headers={...(options.headers||{})};
  if(authorized)headers.authorization='Bearer '+adminKey;
  const response=await fetch(API+path,{...options,headers,cache:'no-store'});
  let data={};
  try{data=await response.json()}catch{}
  if(!response.ok)throw Error(data.error||('Request failed: HTTP '+response.status));
  return data;
}
function combined(){
  const map=new Map(TECHS.map(t=>[t.id,{...t,styles:canonicalNames(t.styles)}]));
  for(const entry of overrides){
    if(!entry||typeof entry.id!=='string'||!idPattern.test(entry.id))continue;
    if(entry.hidden){map.delete(entry.id);continue;}
    if(!STATUS[entry.status]&&entry.status!=='punishable'||!Array.isArray(entry.styles))continue;
    map.set(entry.id,{
      id:entry.id,name:entry.name,status:entry.status==='punishable'?'disallowed':entry.status,styles:canonicalNames(entry.styles),
      video:entry.video||'',note:entry.note||'',ratings:entry.ratings||{},tags:entry.tags||[],
      counterplay:entry.counterplay||'',hasOverride:true
    });
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function styleNames(){
  return canonicalNames([...basicNames,...catalog.flatMap(t=>t.styles)]);
}
function renderStyles(){
  const select=$('filter-style');
  const previous=select.value;
  select.replaceChildren();
  const any=node('option','', 'All styles');any.value='';select.append(any);
  for(const name of styleNames()){
    const option=node('option','',name);option.value=name;select.append(option);
  }
  select.value=styleNames().includes(previous)?previous:'';
  renderStylePicker();
}
function setSelectedStyles(names){
  selectedStyles=new Set(canonicalNames(names));
  $('entry-style-search').value='';
  renderStylePicker();
}
function updateSelectedChips(){
  const chips=$('selected-style-chips');
  chips.replaceChildren();
  for(const name of selectedStyles){
    const button=node('button','style-chip',name+' ×');
    button.type='button';
    button.title='Remove '+name;
    button.setAttribute('aria-label','Remove '+name);
    button.addEventListener('click',()=>{selectedStyles.delete(name);renderStylePicker();});
    chips.append(button);
  }
  if(!selectedStyles.size)chips.append(node('span','style-no-selection','No related styles selected yet'));
  $('selected-style-count').textContent=selectedStyles.size+' selected';
}
function renderStylePicker(){
  const root=$('entry-style-picker');
  const term=$('entry-style-search').value.trim().toLowerCase();
  const all=styleNames();
  const groups=[{label:'Shared mechanics',names:[GENERAL]},...STYLE_GROUPS.map(g=>({label:g.label,names:g.names}))];
  const assigned=new Set(groups.flatMap(g=>g.names));
  const custom=all.filter(n=>!assigned.has(n));
  if(custom.length)groups.push({label:'Custom / New styles',names:custom});
  root.replaceChildren();
  let visible=0;
  for(const group of groups){
    const matches=group.names.filter(name=>name.toLowerCase().includes(term));
    if(!matches.length)continue;
    visible+=matches.length;
    const section=node('fieldset','style-choice-group');
    section.append(node('legend','',group.label));
    const choices=node('div','style-choice-grid');
    for(const name of matches){
      const label=node('label','style-choice');
      const input=node('input');
      input.type='checkbox';input.value=name;
      input.checked=selectedStyles.has(name);
      input.addEventListener('change',()=>{
        if(input.checked)selectedStyles.add(name);
        else selectedStyles.delete(name);
        renderStylePicker();
      });
      label.append(input,node('span','',name));
      if(input.checked)label.classList.add('is-selected');
      choices.append(label);
    }
    section.append(choices);root.append(section);
  }
  $('style-picker-empty').hidden=visible!==0;
  updateSelectedChips();
}
function addCustomStyle(){
  const field=$('entry-custom-style');
  const name=canonicalStyle(field.value);
  if(!name){feedback('editor-message','Enter a style name before adding it.','error');return;}
  if(name.length>48||/[<>{}\u0000-\u001f]/.test(name)){
    feedback('editor-message','Use a valid style name under 48 characters.','error');return;
  }
  selectedStyles.add(name);
  field.value='';
  $('entry-style-search').value='';
  feedback('editor-message','');
  renderStylePicker();
}
function renderList(){
  const term=$('filter-name').value.trim().toLowerCase();
  const style=$('filter-style').value;
  const filtered=catalog.filter(item=>(!style||item.styles.includes(style))&&
    (!term||(item.name+' '+item.styles.join(' ')+' '+item.status).toLowerCase().includes(term)));
  $('entries-count').textContent=filtered.length+' of '+catalog.length+' entries';
  $('admin-summary').textContent=catalog.length+' listed techniques · '+overrides.length+' saved edit(s)';
  $('entry-list-empty').hidden=filtered.length!==0;
  const list=$('entry-list');
  list.replaceChildren();
  for(const item of filtered){
    const button=node('button','admin-entry'+(item.id===selectedId?' active':''));button.type='button';
    button.append(node('strong','',item.name),node('small','',item.styles.join(', ')));
    button.append(node('span','entry-status '+item.status,STATUS[item.status].name));
    button.addEventListener('click',()=>edit(item.id));
    list.append(button);
  }
}
function refreshVisuals(){
  catalog=combined();
  renderStyles();
  renderList();
}
async function refresh(){
  const data=await request('/api/tech');
  if(!Array.isArray(data.entries))throw Error('Tech catalog response is invalid');
  overrides=data.entries;
  refreshVisuals();
}
function newEntry(){
  selectedId=null;
  $('entry-form').reset();
  updateOverallPreview();
  setSelectedStyles($('filter-style').value?[$('filter-style').value]:[]);
  $('editing-id').textContent='';
  $('form-title').textContent='Add a technique';
  $('delete-entry').hidden=true;
  feedback('editor-message','');
  renderList();
  $('entry-name').focus();
}
function edit(id){
  const item=catalog.find(t=>t.id===id);
  if(!item)return;
  selectedId=id;
  $('form-title').textContent='Edit technique';
  $('editing-id').textContent=id;
  $('entry-name').value=item.name;
  setSelectedStyles(item.styles);
  $('entry-status').value=item.status;
  $('entry-video').value=item.hasOverride ? (item.video || '') : (VIDEOS[item.id] || item.video || '');
  $('entry-note').value=item.note||'';
  fillAssessment(item);
  $('delete-entry').hidden=false;
  feedback('editor-message','');
  renderList();
  if(matchMedia('(max-width:780px)').matches){
    $('entry-form').scrollIntoView({behavior:'smooth',block:'start'});
  }
}
function generateId(name,styles){
  let base=(slug(styles[0]||'tech')+'-'+slug(name)).replace(/^-|-$/g,'').slice(0,62).replace(/-+$/,'');
  if(!base||!idPattern.test(base))base='tech-new-entry';
  const known=new Set([...TECHS.map(t=>t.id),...overrides.map(t=>t.id)]);
  let id=base,index=2;
  while(known.has(id)){
    const suffix='-'+index++;
    id=base.slice(0,70-suffix.length).replace(/-+$/,'')+suffix;
  }
  return id;
}
function setBusy(value){
  busy=value;
  $('save-entry').disabled=value;
  $('delete-entry').disabled=value;
  $('reset-entry').disabled=value;
}
async function save(event){
  event.preventDefault();
  if(!adminKey||busy)return;
  const styles=[...selectedStyles];
  if(styles.length===0){
    feedback('editor-message','Select at least one related style.','error');return;
  }
  const body={
    name:$('entry-name').value.trim(),status:$('entry-status').value,
    styles,video:$('entry-video').value.trim(),note:$('entry-note').value.trim(),
    ratings:readRatings(),tags:selectedTags(),counterplay:$('entry-counterplay').value.trim()
  };
  if(body.video&&!videoUrl(body.video)){
    feedback('editor-message','Use a valid YouTube Shorts, watch, or youtu.be link.','error');return;
  }
  const id=selectedId||generateId(body.name,styles);
  setBusy(true);
  try{
    await request('/api/tech/admin/entry/'+encodeURIComponent(id),{
      method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)
    },true);
    await refresh();
    edit(id);
    feedback('editor-message','Saved. The public rules page now uses this entry.','success');
  }catch(error){
    feedback('editor-message',error.message,'error');
  }finally{setBusy(false);}
}
async function remove(){
  if(!selectedId||busy||!adminKey)return;
  const item=catalog.find(t=>t.id===selectedId);
  if(!item)return;
  if(!confirm('Remove "'+item.name+'" from the public directory? You can add it back later.'))return;
  setBusy(true);
  try{
    await request('/api/tech/admin/entry/'+encodeURIComponent(selectedId),{method:'DELETE'},true);
    await refresh();
    newEntry();
    feedback('editor-message','Technique removed from the public directory.','success');
  }catch(error){
    feedback('editor-message',error.message,'error');
  }finally{setBusy(false);}
}
async function connect(event){
  event.preventDefault();
  const entered=$('admin-key').value;
  if(entered.length<32){
    feedback('login-message','Admin key must contain at least 32 characters.','error');return;
  }
  $('connect-button').disabled=true;
  adminKey=entered;
  $('admin-key').value='';
  try{
    await request('/api/tech/admin/session',{},true);
    await refresh();
    $('login-panel').hidden=true;
    $('editor-panel').hidden=false;
    newEntry();
  }catch(error){
    adminKey='';
    feedback('login-message',error.message,'error');
  }finally{$('connect-button').disabled=false;}
}
function logout(){
  adminKey='';overrides=[];catalog=[];selectedId=null;
  $('editor-panel').hidden=true;$('login-panel').hidden=false;
  feedback('login-message','Editor locked. Your key was cleared from this page.');
}
function init(){
  buildAssessmentEditor();
  $('login-form').addEventListener('submit',connect);
  $('entry-form').addEventListener('submit',save);
  $('delete-entry').addEventListener('click',remove);
  $('new-entry').addEventListener('click',newEntry);
  $('reset-entry').addEventListener('click',newEntry);
  $('filter-style').addEventListener('change',renderList);
  $('filter-name').addEventListener('input',renderList);
  $('entry-style-search').addEventListener('input',renderStylePicker);
  $('clear-styles').addEventListener('click',()=>setSelectedStyles([]));
  $('add-custom-style').addEventListener('click',addCustomStyle);
  $('entry-custom-style').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addCustomStyle();}});
  $('logout-button').addEventListener('click',logout);
  $('admin-key').value='';
  catalog=combined();renderStyles();
}
init();
