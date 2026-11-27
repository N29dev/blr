/* Local-only replay validation and ZIP import; no network access. */
const REPLAY_MIB=1024*1024,MAX_REPLAY_BYTES=512*REPLAY_MIB,MAX_REPLAY_ENTRY_BYTES=128*REPLAY_MIB,MAX_REPLAY_FRAMES=250000;
const replaySize=n=>(n/REPLAY_MIB).toFixed(1)+' MiB';
function validId(id){return ['string','number'].includes(typeof id)&&String(id).length>0&&String(id).length<=100&&!['__proto__','constructor','prototype'].includes(String(id))}
function validCF(cf,n=3){return Array.isArray(cf)&&cf.length>=n&&cf.slice(0,n).every(x=>Number.isFinite(x)&&Math.abs(x)<=1e7)}
function validateFrame(f){if(!f||!Number.isFinite(f.t)||f.t<0||!Array.isArray(f.players)||f.players.length>64)throw Error('Invalid replay frame.');for(const p of f.players)if(!p||!validId(p.id)||!validCF(p.cf)||typeof p.team!=='string')throw Error('Invalid player data.');if(f.ball?.cf!=null&&!validCF(f.ball.cf))throw Error('Invalid ball coordinates.');if(f.camera?.cf!=null&&!validCF(f.camera.cf,6))throw Error('Invalid camera coordinates.');if(f.camera?.fov!=null&&!Number.isFinite(f.camera.fov))throw Error('Invalid camera FOV.');return f}
async function unpackReplayZip(file,{maxTotal=MAX_REPLAY_BYTES,maxEntry=MAX_REPLAY_ENTRY_BYTES,preservePaths=false}={}){
 const tailOffset=Math.max(0,file.size-65557),a=new Uint8Array(await file.slice(tailOffset).arrayBuffer()),v=new DataView(a.buffer),u16=i=>v.getUint16(i,true),u32=i=>v.getUint32(i,true);
 if(a.length<22)throw Error('Invalid ZIP.');let e=a.length-22,low=Math.max(0,a.length-65557);while(e>=low&&u32(e)!==0x06054b50)e--;
 if(e<low||u16(e+4)||u16(e+6)||u16(e+8)!==u16(e+10))throw Error('Unsupported ZIP directory.');
 const count=u16(e+10),dirSize=u32(e+12),dirStart=u32(e+16);if(count>2000||dirSize>16*REPLAY_MIB||dirStart+dirSize>tailOffset+e)throw Error('Invalid or oversized ZIP directory.');const directory=new Uint8Array(await file.slice(dirStart,dirStart+dirSize).arrayBuffer()),dv=new DataView(directory.buffer),d16=i=>dv.getUint16(i,true),d32=i=>dv.getUint32(i,true);let off=0,total=0,out=[];const names=new Set();
 for(let i=0;i<count;i++){
 if(off+46>directory.length||d32(off)!==0x02014b50)throw Error('Invalid ZIP entry.');
 const flags=d16(off+8),method=d16(off+10),packed=d32(off+20),size=d32(off+24),nl=d16(off+28),xl=d16(off+30),cl=d16(off+32),local=d32(off+42);
 if(off+46+nl+xl+cl>directory.length)throw Error('Truncated ZIP entry.');
 const full=new TextDecoder().decode(directory.subarray(off+46,off+46+nl));off+=46+nl+xl+cl;const name=full.split('/').pop();
 if(!name||!name.toLowerCase().endsWith('.json')||full.includes('__MACOSX/')||name.startsWith('._'))continue;
 const key=preservePaths?full:name;if(names.has(key))throw Error('Duplicate JSON path: '+full);names.add(key);total+=size;
 if(total>maxTotal)throw Error('Replay JSON expands to '+replaySize(total)+'; limit is '+replaySize(maxTotal)+'.');
 if(size>maxEntry)throw Error('JSON entry '+name+' is '+replaySize(size)+'; split individual chunks below '+replaySize(maxEntry)+'.');
 if(flags&1||![0,8].includes(method)||local+30>dirStart)throw Error('Unsupported ZIP entry: '+name);
 const header=new DataView(await file.slice(local,local+30).arrayBuffer());
 if(header.getUint32(0,true)!==0x04034b50||header.getUint16(8,true)!==method)throw Error('Invalid ZIP local header.');
 const start=local+30+header.getUint16(26,true)+header.getUint16(28,true);
 if(start+packed>dirStart||method===0&&packed!==size)throw Error('Truncated or invalid ZIP data.');
 // Decompress one JSON entry at a time; do not hold the entire ZIP or all inflated entries in RAM.
 out.push({name,path:full,size,async text(){
  const decoder=new TextDecoder();
  if(method===0)return file.slice(start,start+packed).text();
  let stream;try{stream=file.slice(start,start+packed).stream().pipeThrough(new DecompressionStream('deflate-raw'))}catch{throw Error('ZIP decompression unsupported. Extract JSON files first.')}
  const reader=stream.getReader(),parts=[];let n=0;
  try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>size||n>maxEntry){await reader.cancel();throw Error('ZIP exceeds declared size: '+name);}parts.push(decoder.decode(r.value,{stream:true}));}parts.push(decoder.decode());}finally{reader.releaseLock();}
  if(n!==size)throw Error('ZIP entry size mismatch: '+name);return parts.join('');
 }});
 }
 if(!out.length)throw Error('No replay JSON files in ZIP.');return out
}
async function replayFingerprint(chunks,m,large=false){
 if(large){
  // Preserve the legacy fingerprint for small recordings. Large imports hash bounded batches.
  const enc=new TextEncoder(),header=JSON.stringify([m?.id||'',m?.createdAt||'',chunks.length]);
  if(globalThis.crypto?.subtle){const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');const hashes=[await digest(header)];for(let i=0;i<chunks.length;i+=256)hashes.push(await digest(JSON.stringify(chunks.slice(i,i+256))));return 'large-'+await digest(hashes.join(''));}
  let h=2166136261;const update=value=>{for(const b of enc.encode(value))h=Math.imul(h^b,16777619);};update(header);for(let i=0;i<chunks.length;i+=256)update(JSON.stringify(chunks.slice(i,i+256)));return 'large-local-'+chunks.length+'-'+(h>>>0).toString(16);
 }
 const bytes=new TextEncoder().encode(JSON.stringify([m?.id||'',m?.createdAt||'',chunks]));if(globalThis.crypto?.subtle){const h=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('')}let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return 'local-'+bytes.length+'-'+(h>>>0).toString(16)}
/* Each ZIP directory is its own recording. Separate ZIPs never share a namespace.
 * Loose chunks plus metadata form one recording; standalone JSON objects are split later. */
async function replayFileGroups(selected,{maxTotal=MAX_REPLAY_BYTES,maxEntry=MAX_REPLAY_ENTRY_BYTES}={}){
 if(selected.reduce((n,f)=>n+f.size,0)>maxTotal)throw Error('Selected files exceed '+replaySize(maxTotal)+'.');
 const groups=[];let total=0;
 const groupEntries=(entries,source)=>{
  const byDir=new Map();
  for(const f of entries){
   if(f.size>maxEntry)throw Error('Individual JSON exceeds '+replaySize(maxEntry)+': '+f.name);
   total+=f.size;if(total>maxTotal)throw Error('Expanded JSON exceeds '+replaySize(maxTotal)+'.');
   const path=f.path||f.webkitRelativePath||f.name,dir=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';
   if(!byDir.has(dir))byDir.set(dir,[]);
   byDir.get(dir).push(f);
  }
  for(const [dir,files] of byDir){
   const seen=new Set();
   for(const f of files){const n=f.name.toLowerCase();if(seen.has(n))throw Error('Duplicate file within '+(dir||source||'selected JSON')+': '+f.name);seen.add(n);}
   groups.push({name:dir||source||'',files});
  }
 };
 const loose=[];
 for(const f of selected){
  if(/\.zip$/i.test(f.name)){
   const entries=await unpackReplayZip(f,{maxTotal:maxTotal-total,maxEntry,preservePaths:true});
   groupEntries(entries,f.name.replace(/\.zip$/i,''));
  }else if(/\.json$/i.test(f.name))loose.push(f);
 }
 if(loose.length)groupEntries(loose,'');
 return groups;
}
async function parseReplayFiles(selected){
 const groups=await replayFileGroups(selected),matches=[];let count=0;
 async function addMatch(name,chunks,m,p,bytes){
  if(!chunks.length&&!Object.keys(p||{}).length)return;
  count+=chunks.length;if(count>MAX_REPLAY_FRAMES)throw Error('Too many replay frames across selected matches.');
  chunks.sort((a,b)=>a.t-b.t);
  for(let i=1;i<chunks.length;i++)if(chunks[i].t<=chunks[i-1].t)throw Error('Overlapping frame times in '+(name||'selected JSON')+'. Put separate matches in separate folders or ZIPs.');
  matches.push({name,chunks,m,p,fp:chunks.length?await replayFingerprint(chunks,m,bytes>100*REPLAY_MIB):null});
 }
 for(const group of groups){
  let chunks=[],m={},p={},bytes=0;
  for(const file of group.files){
   let d;try{d=JSON.parse(await file.text())}catch{throw Error('Invalid JSON: '+(file.path||file.name))}
   const n=file.name.toLowerCase();
   if(n==='metadata.json'){if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid metadata.');m=d;bytes+=file.size}
   else if(n==='players.json'){p=d||{};bytes+=file.size}
   else if(Array.isArray(d)){for(const v of d)chunks.push(validateFrame(v));bytes+=file.size}
   else if(Array.isArray(d?.frames)){
    await addMatch((group.name?group.name+' / ':'')+file.name.replace(/\.json$/i,''),d.frames.map(validateFrame),d.metadata||d.meta||{},d.players||{},file.size);
   }
   if(chunks.length+count>MAX_REPLAY_FRAMES)throw Error('Too many replay frames across selected matches.');
  }
  await addMatch(group.name,chunks,m,p,bytes);
 }
 return matches;
}
