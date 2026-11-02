import {TECHS,STYLES,GENERAL,STATUS,slug,videoUrl} from '../data.js';
import {VIDEOS} from '../videos.js';

const API='https://glutony.scp343hey.workers.dev';
const $=id=>document.getElementById(id);
let adminKey='';
let overrides=[];
let catalog=[];
let selectedId=null;
let busy=false;
const basicNames=[GENERAL,...STYLES.map(s=>s.name)];
const idPattern=/^[a-z0-9][a-z0-9-]{1,70}$/;

const node=(tag,className='',text=null)=>{
  const result=document.createElement(tag);
  if(className)result.className=className;
  if(text!==null)result.textContent=text;
  return result;
};
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
  const map=new Map(TECHS.map(t=>[t.id,{...t}]));
  for(const entry of overrides){
    if(!entry||typeof entry.id!=='string'||!idPattern.test(entry.id))continue;
    if(entry.hidden){map.delete(entry.id);continue;}
    if(!STATUS[entry.status]||!Array.isArray(entry.styles))continue;
    map.set(entry.id,{
      id:entry.id,name:entry.name,status:entry.status,styles:entry.styles,
      video:entry.video||'',note:entry.note||'',hasOverride:true
    });
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function styleNames(){
  return [...new Set([...basicNames,...catalog.flatMap(t=>t.styles)])];
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
  const datalist=$('style-suggestions');
  datalist.replaceChildren(...styleNames().map(name=>{
    const option=node('option');option.value=name;return option;
  }));
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
  $('entry-styles').value=$('filter-style').value||'';
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
  $('entry-styles').value=item.styles.join(', ');
  $('entry-status').value=item.status;
  $('entry-video').value=item.hasOverride ? (item.video || '') : (VIDEOS[item.id] || item.video || '');
  $('entry-note').value=item.note||'';
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
  const styles=[...new Set($('entry-styles').value.split(',').map(s=>s.trim()).filter(Boolean))];
  if(styles.length===0||styles.length>8){
    feedback('editor-message','Enter 1–8 style names separated by commas.','error');return;
  }
  const body={
    name:$('entry-name').value.trim(),status:$('entry-status').value,
    styles,video:$('entry-video').value.trim(),note:$('entry-note').value.trim()
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
  $('login-form').addEventListener('submit',connect);
  $('entry-form').addEventListener('submit',save);
  $('delete-entry').addEventListener('click',remove);
  $('new-entry').addEventListener('click',newEntry);
  $('reset-entry').addEventListener('click',newEntry);
  $('filter-style').addEventListener('change',renderList);
  $('filter-name').addEventListener('input',renderList);
  $('logout-button').addEventListener('click',logout);
  $('admin-key').value='';
  catalog=combined();renderStyles();
}
init();
