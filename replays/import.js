/* Local-only replay validation and ZIP import; no network access. */
const REPLAY_MIB=1024*1024,MAX_REPLAY_BYTES=512*REPLAY_MIB,MAX_REPLAY_ENTRY_BYTES=128*REPLAY_MIB,MAX_REPLAY_FRAMES=250000;
const replaySize=n=>(n/REPLAY_MIB).toFixed(1)+' MiB';
function validId(id){return ['string','number'].includes(typeof id)&&String(id).length>0&&String(id).length<=100&&!['__proto__','constructor','prototype'].includes(String(id))}
function validCF(cf,n=3){return Array.isArray(cf)&&cf.length>=n&&cf.slice(0,n).every(x=>Number.isFinite(x)&&Math.abs(x)<=1e7)}
function validateFrame(f){if(!f||!Number.isFinite(f.t)||f.t<0||!Array.isArray(f.players)||f.players.length>64)throw Error('Invalid replay frame.');for(const p of f.players)if(!p||!validId(p.id)||!validCF(p.cf)||typeof p.team!=='string')throw Error('Invalid player data.');if(f.ball?.cf!=null&&!validCF(f.ball.cf))throw Error('Invalid ball coordinates.');if(f.camera?.cf!=null&&!validCF(f.camera.cf,6))throw Error('Invalid camera coordinates.');if(f.camera?.fov!=null&&!Number.isFinite(f.camera.fov))throw Error('Invalid camera FOV.');return f}
async function unpackReplayZip(file){
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
 if(names.has(name))throw Error('ZIP contains duplicate JSON names. Import one match at a time.');names.add(name);total+=size;
 if(total>MAX_REPLAY_BYTES)throw Error('Replay JSON expands to '+replaySize(total)+'; limit is 512 MiB per import.');
 if(size>MAX_REPLAY_ENTRY_BYTES)throw Error('JSON entry '+name+' is '+replaySize(size)+'; split individual chunks below 128 MiB.');
 if(flags&1||![0,8].includes(method)||local+30>dirStart)throw Error('Unsupported ZIP entry: '+name);
 const header=new DataView(await file.slice(local,local+30).arrayBuffer());
 if(header.getUint32(0,true)!==0x04034b50||header.getUint16(8,true)!==method)throw Error('Invalid ZIP local header.');
 const start=local+30+header.getUint16(26,true)+header.getUint16(28,true);
 if(start+packed>dirStart||method===0&&packed!==size)throw Error('Truncated or invalid ZIP data.');
 // Decompress one JSON entry at a time; do not hold the entire ZIP or all inflated entries in RAM.
 out.push({name,size,async text(){
  const decoder=new TextDecoder();
  if(method===0)return file.slice(start,start+packed).text();
  let stream;try{stream=file.slice(start,start+packed).stream().pipeThrough(new DecompressionStream('deflate-raw'))}catch{throw Error('ZIP decompression unsupported. Extract JSON files first.')}
  const reader=stream.getReader(),parts=[];let n=0;
  try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>size||n>MAX_REPLAY_ENTRY_BYTES){await reader.cancel();throw Error('ZIP exceeds declared size: '+name);}parts.push(decoder.decode(r.value,{stream:true}));}parts.push(decoder.decode());}finally{reader.releaseLock();}
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
async function parseReplayFiles(selected){
 const selectedBytes=selected.reduce((n,f)=>n+f.size,0);if(selectedBytes>MAX_REPLAY_BYTES)throw Error('Selected '+replaySize(selectedBytes)+'; limit is 512 MiB per import.');
 const zip=selected.filter(f=>/\.zip$/i.test(f.name));if(zip.length&&(zip.length!==1||selected.length!==1))throw Error('Import one match ZIP at a time.');
 const files=zip.length?await unpackReplayZip(zip[0]):selected;let chunks=[],m={},p={};
 function addFrames(fs){if(chunks.length+fs.length>MAX_REPLAY_FRAMES)throw Error('Too many replay frames.');for(const f of fs)chunks.push(validateFrame(f))}
 for(const file of files){if(file.size>MAX_REPLAY_ENTRY_BYTES)throw Error('JSON file '+file.name+' is '+replaySize(file.size)+'; split individual chunks below 128 MiB.');const raw=await file.text();let d;try{d=JSON.parse(raw)}catch{throw Error('Invalid JSON: '+file.name)}
 if(file.name.toLowerCase()==='metadata.json'){if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid metadata.');m=d}else if(file.name.toLowerCase()==='players.json'){p=d||{}}else if(Array.isArray(d))addFrames(d);else if(Array.isArray(d?.frames)){addFrames(d.frames);m=d.metadata||d.meta||m;p=d.players||p}}
 chunks.sort((a,b)=>a.t-b.t);return {chunks,m,p,fp:chunks.length?await replayFingerprint(chunks,m,files.reduce((n,f)=>n+(f.size||0),0)>100*REPLAY_MIB):null}
}
