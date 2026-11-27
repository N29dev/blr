/* Browser-only replay conversion. Loaded in a dedicated worker. */
importScripts('/replays/import.js?v=4','/field/geometry.js','/replays/analysis.js?v=3');
const MAX_INPUT=2*1024**3,MAX_ENTRY=128*1024**2,MAX_SOURCE_FRAMES=500000;
const STAT_KEYS=new Set(['AnkleBreakers','Assists','FilteredPasses','Goals','Points','Saves','Steals','Ping','Style','Flow','InCutscene']);
const COUNTER_EVENTS=new Set(['ankle_break','assist','pass_count','goal_credit','save','steal']);
const enc=new TextEncoder();
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function normalizePlayers(p){if(Array.isArray(p))return Object.fromEntries(p.filter(object).map((v,i)=>[String(v.id??i+1),v]));return object(p)?p:{};}
function cleanReplayFrame(f,roster,removeNpc){
 validateFrame(f);
 const removed=new Set(),out={t:f.t,players:[]};
 for(const p of f.players){
  if(removeNpc&&!replayActiveActor(p,BLRFieldGeometry,roster)){removed.add(String(p.id));continue;}
  const a={id:p.id,team:p.team,cf:p.cf,hasBall:p.hasBall===true};
  if(typeof p.kind==='string')a.kind=p.kind;
  if(typeof p.style==='string'&&p.style.length<=128)a.style=p.style;
  if(typeof p.states?.InCutscene==='boolean')a.states={InCutscene:p.states.InCutscene};
  if([-1,0,1,2].includes(p.awk))a.awk=p.awk;
  if(typeof p.inAwakening==='boolean')a.inAwakening=p.inAwakening;
  if(typeof p.awkReadyFlag==='boolean')a.awkReadyFlag=p.awkReadyFlag;
  if(Array.isArray(p.abilitySlots)){
   const slots=new Map();
   for(const item of p.abilitySlots.slice(0,16)){
    if(!object(item)||![1,2,3].includes(item.slot))continue;
    const slot={slot:item.slot,name:typeof item.name==='string'&&item.name.trim()?item.name.slice(0,128):'?'};
    for(const k of ['cdUntil','rawCooldown','serverAt','tickAt','observedAt'])if(Number.isFinite(item[k])&&item[k]>=0)slot[k]=item[k];
    if(['server','tick','zero'].includes(item.clock))slot.clock=item.clock;
    slots.set(item.slot,slot);
   }
   a.abilitySlots=[...slots.values()];
  }
  out.players.push(a);
 }
 if(object(f.ball)){out.ball=removed.has(String(f.ball.owner))?{state:'unknown'}:{state:f.ball.state,owner:f.ball.owner,cf:f.ball.cf};}
 if(object(f.camera)&&f.camera.cf)out.camera={cf:f.camera.cf,fov:f.camera.fov};
 if(object(f.scoreboard))out.scoreboard={home:f.scoreboard.home,away:f.scoreboard.away,timer:f.scoreboard.timer};
 if(Array.isArray(f.playerScoreboard)&&f.playerScoreboard.length<=64){const seen=new Set();out.playerScoreboard=[];for(const p of f.playerScoreboard){if(!object(p)||!validId(p.id)||!['Home','Away'].includes(p.team)||seen.has(String(p.id))||roster[String(p.id)]?.kind==='npc')continue;seen.add(String(p.id));const row={id:p.id,team:p.team};if(typeof p.position==='string'&&/^[A-Z][A-Z0-9]{0,11}$/.test(p.position))row.position=p.position;for(const k of ['Points','Goals','Assists','Saves','Steals','Ping'])if(Number.isFinite(p[k])&&p[k]>=0&&p[k]<1e12)row[k]=Math.round(p[k]);out.playerScoreboard.push(row);}}
 if(object(f.localStats))out.localStats=Object.fromEntries(Object.entries(f.localStats).filter(([k,v])=>STAT_KEYS.has(k)&&(typeof v==='boolean'||typeof v==='string'&&v.length<=128||Number.isFinite(v))));
 if(Array.isArray(f.events)){const events=f.events.filter(e=>object(e)&&((e.source==='counter'&&COUNTER_EVENTS.has(e.type))||(e.source==='state'&&e.type==='stunned'&&roster[String(e.playerId)]?.kind!=='npc'&&f.players.some(p=>String(p.id)===String(e.playerId)&&p.kind!=='npc')))&&validId(e.playerId)&&Number.isFinite(e.t));for(const e of f.events){if(!object(e)||!validId(e.playerId)||!Number.isFinite(e.t)||e.t<0||roster[String(e.playerId)]?.kind==='npc')continue;if(e.type==='ability_slot'&&e.source==='replicated'&&[1,2,3].includes(e.slot)){const v={type:e.type,t:e.t,playerId:e.playerId,source:e.source,slot:e.slot};if(typeof e.name==='string')v.name=e.name.slice(0,128);for(const k of ['cdUntil','rawCooldown','serverAt','tickAt','batchSize'])if(Number.isFinite(e[k])&&e[k]>=0)v[k]=e[k];for(const k of ['nameChanged','cooldownChanged'])if(typeof e[k]==='boolean')v[k]=e[k];if(['server','tick','zero'].includes(e.clock))v.clock=e.clock;events.push(v)}else if(e.type==='awakening_start'&&e.source==='replicated'||e.type==='awakening_state'&&e.source==='playerStats'&&[-1,0,1,2].includes(e.awk)){const v={type:e.type,t:e.t,playerId:e.playerId,source:e.source};if([-1,0,1,2].includes(e.awk))v.awk=e.awk;for(const k of ['inAwakening','readyFlag'])if(typeof e[k]==='boolean')v[k]=e[k];events.push(v)}}if(events.length)out.events=events;}
 return {frame:out,removed:removed.size};
}
function createReducer(fps,emit){
 let first=null,last=null,lastSaved=null,pending=null,score=null,sem=null,count=0,oldCount=0;
 const stats=new Map(),styles=new Map();
 function send(f){emit(f);lastSaved=f.t;count++;}
 return {push(f){
  if(last!==null&&f.t<=last)throw Error('Duplicate or overlapping frame timestamps. Choose one recording.');
  if(first===null)first=f.t;last=f.t;oldCount++;
  const delta={};for(const [k,v] of Object.entries(f.localStats||{})){if(!stats.has(k)||stats.get(k)!==v){stats.set(k,v);delta[k]=v;}}
  delete f.localStats;if(Object.keys(delta).length)f.localStats=delta;
  let styleChanged=false;for(const p of f.players){if(typeof p.style==='string'){const id=String(p.id);if(styles.get(id)===p.style)delete p.style;else{styles.set(id,p.style);styleChanged=true;}}}
  const scoreKey=JSON.stringify([f.scoreboard?.home,f.scoreboard?.away]),semanticKey=JSON.stringify([f.ball?.state,f.ball?.owner,f.players.map(p=>[String(p.id),p.team,p.hasBall,p.states?.InCutscene===true]).sort((a,b)=>a[0].localeCompare(b[0]))]);
  const important=Boolean(f.localStats||f.playerScoreboard||styleChanged||f.players.some(p=>Array.isArray(p.abilitySlots)||[-1,0,1,2].includes(p.awk)||typeof p.inAwakening==='boolean'||typeof p.awkReadyFlag==='boolean')||f.events||score!==scoreKey||sem!==semanticKey);
  score=scoreKey;sem=semanticKey;
  const regular=lastSaved===null||!fps||Math.floor((f.t-first+1e-8)*fps)>Math.floor((lastSaved-first+1e-8)*fps);
  if(important||regular){send(f);pending=null;}else pending=f;
 },finish(){if(pending)send(pending);return {count,oldCount,last,first};}};
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function createZip(){
 const parts=[],central=[];let offset=0,raw=0;
 function header(n){const a=new Uint8Array(n),d=new DataView(a.buffer);return {a,u16:(i,x)=>d.setUint16(i,x,true),u32:(i,x)=>d.setUint32(i,x,true)};}
 return {async add(name,value){
  const data=enc.encode(JSON.stringify(value)),n=enc.encode(name);raw+=data.length;
  let packed=data,method=0;
  try{const z=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());if(z.length<data.length){packed=z;method=8;}}catch{/* Stored ZIP fallback for older browsers. */}
  const crc=crc32(data),local=header(30),dir=header(46);
  local.u32(0,0x04034b50);local.u16(4,20);local.u16(6,0x800);local.u16(8,method);local.u16(12,33);local.u32(14,crc);local.u32(18,packed.length);local.u32(22,data.length);local.u16(26,n.length);
  dir.u32(0,0x02014b50);dir.u16(4,20);dir.u16(6,20);dir.u16(8,0x800);dir.u16(10,method);dir.u16(14,33);dir.u32(16,crc);dir.u32(20,packed.length);dir.u32(24,data.length);dir.u16(28,n.length);dir.u32(42,offset);
  parts.push(local.a,n,packed);central.push(dir.a,n);offset+=local.a.length+n.length+packed.length;
  if(offset>0xffffffff)throw Error('Output exceeds ZIP size limit.');
 },finish(){const length=central.reduce((n,b)=>n+b.length,0),end=header(22),count=central.length/2;if(count>2000)throw Error('Output exceeds 2,000 ZIP entries; select fewer matches.');end.u32(0,0x06054b50);end.u16(8,count);end.u16(10,count);end.u32(12,length);end.u32(16,offset);return {blob:new Blob([...parts,...central,end.a],{type:'application/zip'}),raw};}};
}
async function convertReplayGroup(entries,{fps,removeNpc},zip,prefix,maxFrames,progress){
 const inputRaw=entries.reduce((n,f)=>n+f.size,0);
 const read=async f=>{const s=await f.text();try{return JSON.parse(s);}catch{throw Error('Invalid JSON: '+f.name);}};
 let meta={},roster={},files=[];
 for(const f of entries){const n=f.name.toLowerCase();if(n==='metadata.json'){meta=await read(f);if(!object(meta))throw Error('Invalid metadata.');}else if(n==='players.json'){roster=normalizePlayers(await read(f));}else if(n.endsWith('.json'))files.push(f);}
 files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
 let buffer=[],chunks=0,removed=0,seen=0,discarded=0;
 const reducer=createReducer(fps,f=>buffer.push(f));
 async function flush(){while(buffer.length>=300){await zip.add(prefix+'chunk_'+String(++chunks).padStart(6,'0')+'.json',buffer.splice(0,300));}}
 for(let j=0;j<files.length;j++){
  const obj=await read(files[j]),fs=Array.isArray(obj)?obj:obj?.frames;
  if(!Array.isArray(fs))throw Error('Unsupported replay JSON: '+files[j].name);
  if(!Array.isArray(obj)){const embedded=obj.metadata||obj.meta;if(object(embedded))meta={...meta,...embedded};roster={...roster,...normalizePlayers(obj.players)};}
  fs.sort((a,b)=>(a?.t??-1)-(b?.t??-1));
  for(const original of fs){if(++seen>maxFrames)throw Error('Replay exceeds 500,000 source frames. Split the recording.');const {frame,removed:n}=cleanReplayFrame(original,roster,removeNpc);removed+=n;discarded+=(Array.isArray(original.events)?original.events.length:0)-(frame.events?.length||0);reducer.push(frame);if(buffer.length>=300)await flush();}
  progress({fraction:(j+1)/Math.max(1,files.length)*.95,message:'Processed '+(j+1)+' of '+files.length+' JSON files · '+seen.toLocaleString()+' frames'});
 }
 const result=reducer.finish();if(!result.oldCount)throw Error('No replay frames found.');
 if(buffer.length)await zip.add(prefix+'chunk_'+String(++chunks).padStart(6,'0')+'.json',buffer);
 const extensions=Array.isArray(meta.extensions)?meta.extensions.filter(x=>x!=='states'):[];
 await zip.add(prefix+'players.json',roster);
 await zip.add(prefix+'metadata.json',{...meta,version:2,convertedBy:'replay-lite-web-1.0',originalSampleRate:meta.originalSampleRate??meta.sampleRate,sampleRate:fps?(Number.isFinite(meta.sampleRate)?Math.min(fps,meta.sampleRate):fps):meta.sampleRate,frames:result.count,chunks,duration:result.last,eventMode:extensions.includes('abilitySlots')||extensions.includes('awakeningStates')?'match-counters-stuns-and-ability-state':'match-counters-and-stun-starts',extensions:[...new Set([...extensions,'localStats','events','playerStyles'])]});
 return {inputRaw,oldFrames:result.oldCount,frames:result.count,removed,discarded};
}
async function convertReplay(selected,{fps=30,removeNpc=true}={},progress=()=>{}){
 if(![0,15,30,60].includes(fps))throw Error('Invalid target recording rate.');
 if(!selected.length)throw Error('Choose replay ZIPs or JSON files.');
 const groups=await replayFileGroups(selected,{maxTotal:MAX_INPUT,maxEntry:MAX_ENTRY}),matches=[];
 // Combined replay JSONs own their metadata; loose numbered chunks belong to their directory.
 for(const g of groups){
  const chunks=[];
  for(const f of g.files){
   if(/^(metadata|players|chunk_\d+)\.json$/i.test(f.name)){chunks.push(f);continue;}
   let v;try{v=JSON.parse(await f.text())}catch{throw Error('Invalid JSON: '+f.name)}
   if(Array.isArray(v?.frames))matches.push({name:(g.name?g.name+' / ':'')+f.name.replace(/\.json$/i,''),files:[f]});
   else chunks.push(f);
  }
  if(chunks.some(f=>! /^(metadata|players)\.json$/i.test(f.name)))matches.push({name:g.name,files:chunks});
 }
 if(!matches.length)throw Error('No replay frames found.');
 const zip=createZip(),totals={inputRaw:0,oldFrames:0,frames:0,removed:0,discarded:0};const names=new Set();
 for(let i=0;i<matches.length;i++){
  const g=matches[i];let name=(g.name.split('/').filter(Boolean).at(-1)||'Match '+(i+1)).replace(/[^\p{L}\p{N} ._-]/gu,'_').slice(0,80).trim();
  if(!name||name==='.'||name==='..')name='Match '+(i+1);
  let unique=name,n=2;while(names.has(unique.toLowerCase()))unique=name+' '+n++;names.add(unique.toLowerCase());
  const prefix=matches.length>1?unique+'/':'';
  const part=await convertReplayGroup(g.files,{fps,removeNpc},zip,prefix,MAX_SOURCE_FRAMES-totals.oldFrames,p=>progress({fraction:(i+p.fraction)/matches.length,message:'Match '+(i+1)+'/'+matches.length+' · '+p.message}));
  for(const k of Object.keys(totals))totals[k]+=part[k];
 }
 const output=zip.finish();return {blob:output.blob,...totals,matchCount:matches.length,outputRaw:output.raw,inputBytes:selected.reduce((n,f)=>n+f.size,0),overLimit:output.raw>MAX_REPLAY_BYTES||totals.frames>MAX_REPLAY_FRAMES};
}

self.onmessage=async({data})=>{try{const r=await convertReplay(data.files,data.options,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',...r});}catch(e){self.postMessage({type:'error',message:e?.message||String(e)});}};
