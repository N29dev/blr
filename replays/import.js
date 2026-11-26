/* Local-only replay validation and ZIP import; no network access. */
const MAX_REPLAY_BYTES=100*1024*1024,MAX_REPLAY_FRAMES=250000;
function validId(id){return ['string','number'].includes(typeof id)&&String(id).length>0&&String(id).length<=100&&!['__proto__','constructor','prototype'].includes(String(id))}
function validCF(cf,n=3){return Array.isArray(cf)&&cf.length>=n&&cf.slice(0,n).every(x=>Number.isFinite(x)&&Math.abs(x)<=1e7)}
function validateFrame(f){if(!f||!Number.isFinite(f.t)||f.t<0||!Array.isArray(f.players)||f.players.length>64)throw Error('Invalid replay frame.');for(const p of f.players)if(!p||!validId(p.id)||!validCF(p.cf)||typeof p.team!=='string')throw Error('Invalid player data.');if(f.ball?.cf!=null&&!validCF(f.ball.cf))throw Error('Invalid ball coordinates.');if(f.camera?.cf!=null&&!validCF(f.camera.cf,6))throw Error('Invalid camera coordinates.');if(f.camera?.fov!=null&&!Number.isFinite(f.camera.fov))throw Error('Invalid camera FOV.');return f}
async function unpackReplayZip(file){
 const a=new Uint8Array(await file.arrayBuffer()),v=new DataView(a.buffer),u16=i=>v.getUint16(i,true),u32=i=>v.getUint32(i,true);
 if(a.length<22)throw Error('Invalid ZIP.');let e=a.length-22,low=Math.max(0,a.length-65557);while(e>=low&&u32(e)!==0x06054b50)e--;
 if(e<low||u16(e+4)||u16(e+6)||u16(e+8)!==u16(e+10))throw Error('Unsupported ZIP directory.');
 const count=u16(e+10);if(count>2000)throw Error('Too many ZIP entries.');let off=u32(e+16),total=0,out=[];const names=new Set();
 for(let i=0;i<count;i++){
 if(off+46>a.length||u32(off)!==0x02014b50)throw Error('Invalid ZIP entry.');
 const flags=u16(off+8),method=u16(off+10),packed=u32(off+20),size=u32(off+24),nl=u16(off+28),xl=u16(off+30),cl=u16(off+32),local=u32(off+42);
 if(off+46+nl+xl+cl>a.length)throw Error('Truncated ZIP entry.');
 const full=new TextDecoder().decode(a.subarray(off+46,off+46+nl));off+=46+nl+xl+cl;const name=full.split('/').pop();
 if(!name||!name.toLowerCase().endsWith('.json')||full.includes('__MACOSX/')||name.startsWith('._'))continue;
 if(names.has(name))throw Error('ZIP contains duplicate JSON names. Import one match at a time.');names.add(name);total+=size;
 if(total>MAX_REPLAY_BYTES||flags&1||![0,8].includes(method)||local+30>a.length||u32(local)!==0x04034b50)throw Error('Unsupported or oversized ZIP entry.');
 const start=local+30+u16(local+26)+u16(local+28);if(start+packed>a.length)throw Error('Truncated ZIP data.');let bytes=a.subarray(start,start+packed);
 if(method===8){let stream;try{stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))}catch{throw Error('ZIP decompression unsupported. Extract JSON files first.')}
 const reader=stream.getReader(),parts=[];let n=0;while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>size||n>MAX_REPLAY_BYTES){await reader.cancel();throw Error('ZIP exceeds declared size.')}parts.push(r.value)}bytes=new Uint8Array(n);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.length}}
 if(bytes.length!==size)throw Error('ZIP entry size mismatch.');out.push({name,text:()=>Promise.resolve(new TextDecoder().decode(bytes))})
 }
 if(!out.length)throw Error('No replay JSON files in ZIP.');return out
}
async function replayFingerprint(chunks,m){const bytes=new TextEncoder().encode(JSON.stringify([m?.id||'',m?.createdAt||'',chunks]));if(globalThis.crypto?.subtle){const h=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('')}let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return 'local-'+bytes.length+'-'+(h>>>0).toString(16)}
async function parseReplayFiles(selected){
 if(selected.reduce((n,f)=>n+f.size,0)>MAX_REPLAY_BYTES)throw Error('Select no more than 100 MB.');
 const zip=selected.filter(f=>/\.zip$/i.test(f.name));if(zip.length&&(zip.length!==1||selected.length!==1))throw Error('Import one match ZIP at a time.');
 const files=zip.length?await unpackReplayZip(zip[0]):selected;let chunks=[],m={},p={};
 function addFrames(fs){if(chunks.length+fs.length>MAX_REPLAY_FRAMES)throw Error('Too many replay frames.');for(const f of fs)chunks.push(validateFrame(f))}
 for(const file of files){let d;try{d=JSON.parse(await file.text())}catch{throw Error('Invalid JSON: '+file.name)}
 if(file.name.toLowerCase()==='metadata.json'){if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid metadata.');m=d}else if(file.name.toLowerCase()==='players.json'){p=d||{}}else if(Array.isArray(d))addFrames(d);else if(Array.isArray(d?.frames)){addFrames(d.frames);m=d.metadata||d.meta||m;p=d.players||p}}
 chunks.sort((a,b)=>a.t-b.t);return {chunks,m,p,fp:chunks.length?await replayFingerprint(chunks,m):null}
}
