/* Browser-only replay conversion. Loaded in a dedicated worker. */
importScripts('/replays/import.js?v=2','/field/geometry.js','/replays/analysis.js?v=3');
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
  out.players.push(a);
 }
 if(object(f.ball)){out.ball=removed.has(String(f.ball.owner))?{state:'unknown'}:{state:f.ball.state,owner:f.ball.owner,cf:f.ball.cf};}
 if(object(f.camera)&&f.camera.cf)out.camera={cf:f.camera.cf,fov:f.camera.fov};
 if(object(f.scoreboard))out.scoreboard={home:f.scoreboard.home,away:f.scoreboard.away,timer:f.scoreboard.timer};
 if(Array.isArray(f.playerScoreboard)&&f.playerScoreboard.length<=64){const seen=new Set();out.playerScoreboard=[];for(const p of f.playerScoreboard){if(!object(p)||!validId(p.id)||!['Home','Away'].includes(p.team)||seen.has(String(p.id))||roster[String(p.id)]?.kind==='npc')continue;seen.add(String(p.id));const row={id:p.id,team:p.team};if(typeof p.position==='string'&&/^[A-Z][A-Z0-9]{0,11}$/.test(p.position))row.position=p.position;for(const k of ['Points','Goals','Assists','Saves','Steals','Ping'])if(Number.isFinite(p[k])&&p[k]>=0&&p[k]<1e12)row[k]=Math.round(p[k]);out.playerScoreboard.push(row);}}
 if(object(f.localStats))out.localStats=Object.fromEntries(Object.entries(f.localStats).filter(([k,v])=>STAT_KEYS.has(k)&&(typeof v==='boolean'||typeof v==='string'&&v.length<=128||Number.isFinite(v))));
 if(Array.isArray(f.events)){const events=f.events.filter(e=>object(e)&&((e.source==='counter'&&COUNTER_EVENTS.has(e.type))||(e.source==='state'&&e.type==='stunned'&&roster[String(e.playerId)]?.kind!=='npc'&&f.players.some(p=>String(p.id)===String(e.playerId)&&p.kind!=='npc')))&&validId(e.playerId)&&Number.isFinite(e.t));if(events.length)out.events=events;}
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
  const important=Boolean(f.localStats||f.playerScoreboard||styleChanged||f.events||score!==scoreKey||sem!==semanticKey);
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
 },finish(){const length=central.reduce((n,b)=>n+b.length,0),end=header(22),count=central.length/2;end.u32(0,0x06054b50);end.u16(8,count);end.u16(10,count);end.u32(12,length);end.u32(16,offset);return {blob:new Blob([...parts,...central,end.a],{type:'application/zip'}),raw};}};
}
async function convertReplay(selected,{fps=30,removeNpc=true}={},progress=()=>{}){
 if(![0,15,30,60].includes(fps))throw Error('Invalid target recording rate.');
 if(!selected.length)throw Error('Choose a replay ZIP or JSON files.');
 if(selected.reduce((n,f)=>n+f.size,0)>MAX_INPUT)throw Error('Input exceeds 2 GiB safety limit.');
 const zips=selected.filter(f=>/\.zip$/i.test(f.name));if(zips.length&&(zips.length!==1||selected.length!==1))throw Error('Select one ZIP or the JSON files of one match.');
 const entries=zips.length?await unpackReplayZip(zips[0],{maxTotal:MAX_INPUT,maxEntry:MAX_ENTRY}):selected;
 const names=new Set();for(const f of entries){const n=f.name.toLowerCase();if(names.has(n))throw Error('Duplicate JSON names. Select one match.');names.add(n);if(f.size>MAX_ENTRY)throw Error('Individual JSON exceeds 128 MiB: '+f.name);}
 const inputRaw=entries.reduce((n,f)=>n+f.size,0);if(inputRaw>MAX_INPUT)throw Error('Expanded replay exceeds 2 GiB safety limit.');
 const read=async f=>{const s=await f.text();try{return JSON.parse(s);}catch{throw Error('Invalid JSON: '+f.name);}};
 let meta={},roster={},files=[];
 for(const f of entries){const n=f.name.toLowerCase();if(n==='metadata.json'){meta=await read(f);if(!object(meta))throw Error('Invalid metadata.');}else if(n==='players.json'){roster=normalizePlayers(await read(f));}else if(n.endsWith('.json'))files.push(f);}
 files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
 const zip=createZip();let buffer=[],chunks=0,removed=0,seen=0,discarded=0;
 const reducer=createReducer(fps,f=>buffer.push(f));
 async function flush(){while(buffer.length>=300){await zip.add('chunk_'+String(++chunks).padStart(6,'0')+'.json',buffer.splice(0,300));}}
 for(let j=0;j<files.length;j++){
  const obj=await read(files[j]),fs=Array.isArray(obj)?obj:obj?.frames;
  if(!Array.isArray(fs))throw Error('Unsupported replay JSON: '+files[j].name);
  if(!Array.isArray(obj)){const embedded=obj.metadata||obj.meta;if(object(embedded))meta={...meta,...embedded};roster={...roster,...normalizePlayers(obj.players)};}
  fs.sort((a,b)=>(a?.t??-1)-(b?.t??-1));
  for(const original of fs){if(++seen>MAX_SOURCE_FRAMES)throw Error('Replay exceeds 500,000 source frames. Split the recording.');const {frame,removed:n}=cleanReplayFrame(original,roster,removeNpc);removed+=n;discarded+=(Array.isArray(original.events)?original.events.length:0)-(frame.events?.length||0);reducer.push(frame);if(buffer.length>=300)await flush();}
  progress({fraction:(j+1)/Math.max(1,files.length)*.95,message:'Processed '+(j+1)+' of '+files.length+' JSON files · '+seen.toLocaleString()+' frames'});
 }
 const result=reducer.finish();if(!result.oldCount)throw Error('No replay frames found.');
 if(buffer.length)await zip.add('chunk_'+String(++chunks).padStart(6,'0')+'.json',buffer);
 const extensions=Array.isArray(meta.extensions)?meta.extensions.filter(x=>x!=='states'):[];
 await zip.add('players.json',roster);
 await zip.add('metadata.json',{...meta,version:2,convertedBy:'replay-lite-web-1.0',originalSampleRate:meta.originalSampleRate??meta.sampleRate,sampleRate:fps?(Number.isFinite(meta.sampleRate)?Math.min(fps,meta.sampleRate):fps):meta.sampleRate,frames:result.count,chunks,duration:result.last,eventMode:'match-counters-and-stun-starts',extensions:[...new Set([...extensions,'localStats','events','playerStyles'])]});
 const output=zip.finish();return {blob:output.blob,inputRaw,outputRaw:output.raw,inputBytes:selected.reduce((n,f)=>n+f.size,0),oldFrames:result.oldCount,frames:result.count,removed,discarded,overLimit:output.raw>MAX_REPLAY_BYTES||result.count>MAX_REPLAY_FRAMES};
}
self.onmessage=async({data})=>{try{const r=await convertReplay(data.files,data.options,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',...r});}catch(e){self.postMessage({type:'error',message:e?.message||String(e)});}};
