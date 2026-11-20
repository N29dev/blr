import {STYLES_WIKI} from '../content.mjs?v=4';
import {FIELDS,today,needsRetest,wikiRequest} from '../tested-data.mjs?v=1';
const $=id=>document.getElementById(id),form=$('record'),style=$('style');
const node=(tag,value)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;return e;};
let key='',entries=[],announcements=[],patches=[],selected=null,dirty=false,busy=false,sequence=0,loadedStyle='';
const msg=(str)=>{$('status').textContent=str;};
function lock(){key='';sequence++;entries=[];announcements=[];patches=[];selected=null;dirty=false;loadedStyle='';HTMLFormElement.prototype.reset.call(form);form.hidden=true;$('history-list').replaceChildren();$('history').hidden=true;$('announcement').textContent='';$('ability-list').replaceChildren();$('workspace').hidden=true;$('login-panel').hidden=false;$('key').value='';$('login-status').textContent='Editor locked.';}
function allowChange(){return !dirty||confirm('Discard unsaved edits?');}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
for(const row of FIELDS){
 const [name,label,type,max]=row,l=node('label',label),input=node(type==='textarea'?'textarea':'input');
 input.name=name;if(type!=='textarea')input.type=type;
 if(type==='number'){input.min='0';input.max='100000';input.step='any';input.placeholder='Not tested';}
 if(max)input.maxLength=max;if(['name','kit','testedOn'].includes(name))input.required=true;
 if(type==='date'){input.min='2024-01-01';input.max=today();}
 if(type==='textarea')l.className='wide';l.append(input);$('fields').append(l);
}
for(const s of [...STYLES_WIKI].sort((a,b)=>a.name.localeCompare(b.name))){const o=node('option',s.name);o.value=s.id;style.append(o);}
const match=(r,a)=>r.name.trim().toLowerCase()===a.name.trim().toLowerCase()&&r.kit.trim().toLowerCase()===a.kit.trim().toLowerCase();
function options(){return [...entries.map(r=>({record:r})),...announcements.filter(a=>!entries.some(r=>match(r,a))).map(a=>({announcement:a}))];}
function renderList(){
 const root=$('ability-list');root.replaceChildren();const q=$('filter').value.toLowerCase().trim();
 for(const item of options()){const r=item.record||item.announcement;if(![r.name,r.kit].join(' ').toLowerCase().includes(q))continue;
  const b=node('button');b.type='button';b.className='ability-choice';b.setAttribute('aria-pressed',String(selected?.id===item.record?.id&&!!item.record||selected?.announcement===item.announcement&&!!item.announcement));
  b.append(node('strong',r.name),node('small',r.kit+' · '+(item.record?(r.archived?'Archived':needsRetest(r,patches)?'Review after patch':'Tested '+r.testedOn):'Announcement · not tested')));
  b.addEventListener('click',()=>{if(!busy&&allowChange())selectItem(item);});root.append(b);
 }
 $('list-status').textContent=entries.length+' saved · '+announcements.length+' announced';
}
function fill(r){HTMLFormElement.prototype.reset.call(form);for(const [n] of FIELDS)form.elements[n].value=r[n]??'';form.elements.archived.checked=!!r.archived;dirty=false;}
async function selectItem(item={}){
 const record=item.record,announcement=item.announcement;
 selected={id:record?.id||crypto.randomUUID(),revision:record?.revision||0,announcement,original:record||{name:announcement?.name||'',kit:announcement?.kit||'Base',input:announcement?.input||'',condition:announcement?.condition||'',testedOn:'',archived:false}};
 fill(selected.original);form.hidden=false;$('form-title').textContent=record?'Edit '+record.name:announcement?'Test '+announcement.name:'Add ability';
 $('announcement').textContent=announcement?'Prefilled from '+announcement.date+' announcement. Confirm the kit, conditions and tested date yourself.':record?'Revision '+record.revision+' · tested '+record.testedOn:'Enter the ability name and kit first.';
 $('history').hidden=!record;$('history-list').replaceChildren();msg('');renderList();
 if(!record)return;const id=selected.id,slug=loadedStyle,seq=sequence;
 try{const result=await wikiRequest('/admin/styles/'+slug+'/'+id+'/history',{key});if(seq!==sequence||selected?.id!==id||!key)return;
 for(const r of result.entries){const row=node('div');row.className='history-entry';row.append(node('span','Revision '+r.revision+' · '+r.testedOn+' · '+(r.archived?'Archived':'Published')));const b=node('button','Load');b.type='button';b.className='kb-clear-filter';b.addEventListener('click',()=>{if(!busy&&allowChange()){fill(r);dirty=true;msg('Loaded revision '+r.revision+'. Publish to restore.');}});row.append(b);$('history-list').append(row);}
 }catch(e){if(seq===sequence&&selected?.id===id)msg(e.message);}
}
async function loadStyle(value){
 const seq=++sequence;busy=true;style.disabled=true;selected=null;dirty=false;form.hidden=true;$('history').hidden=true;$('announcement').textContent='';$('form-title').textContent='Select an ability';$('ability-list').replaceChildren();$('list-status').textContent='Loading…';msg('');
 try{const [saved,archive]=await Promise.all([wikiRequest('/admin/styles/'+value,{key}),fetch('/wiki/records/styles/'+value+'.json?v=1').then(r=>{if(!r.ok)throw Error('Announcement data unavailable');return r.json();})]);
 if(seq!==sequence||!key)return;entries=saved.entries;announcements=archive.abilities;patches=archive.history;loadedStyle=value;$('public-link').href='/styles/'+value+'/';renderList();
 }catch(e){if(seq===sequence){entries=[];announcements=[];patches=[];loadedStyle='';$('list-status').textContent=e.message;}}
 finally{if(seq===sequence){busy=false;style.disabled=false;}}
}
$('login').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;key=$('key').value;$('key').value='';$('login-status').textContent='Checking authorization…';try{await wikiRequest('/admin/session',{key});$('workspace').hidden=false;$('login-panel').hidden=true;busy=false;await loadStyle(style.value);}catch(e){key='';$('login-status').textContent=e.message;busy=false;}});
$('lock').addEventListener('click',()=>{if(!busy&&allowChange())lock();});
style.addEventListener('change',()=>{if(allowChange())loadStyle(style.value);else style.value=loadedStyle;});
$('filter').addEventListener('input',renderList);
$('new').addEventListener('click',()=>{if(!busy&&loadedStyle&&allowChange())selectItem();});
form.addEventListener('input',()=>{dirty=true;});
$('reset-record').addEventListener('click',()=>{if(!busy&&selected){fill(selected.original);msg('Reset to saved values.');}});
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!key||!selected||!loadedStyle)return;
 const body={revision:selected.revision,archived:form.elements.archived.checked};
 for(const [n,,type] of FIELDS){const value=form.elements[n].value;body[n]=type==='number'?(value===''?null:Number(value)):value.trim();}
 if(!body.testedOn){msg('Enter the actual last tested date.');return;}
 if(entries.some(r=>r.id!==selected.id&&match(r,body))){msg('An ability with this name and kit already exists. Edit that record instead.');return;}
 busy=true;$('publish').disabled=true;style.disabled=true;msg('Publishing…');try{
 const {entry}=await wikiRequest('/admin/styles/'+loadedStyle+'/'+selected.id,{key,method:'PUT',body});entries=entries.filter(r=>r.id!==entry.id);entries.push(entry);dirty=false;await selectItem({record:entry});msg('Published revision '+entry.revision+'. The public article now reads this tested record.');
 }catch(e){msg(e.message);}finally{busy=false;$('publish').disabled=false;style.disabled=false;}
});
