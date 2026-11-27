// Standalone publisher for an explicitly selected, authorized NDJSON source.
import {open} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {cleanFrame,cleanBatch,MAX_PACKET,STREAM_LIMIT} from './authorized-stream.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LINE_LIMIT=65536,MAX_QUEUE=720;
export function normalizeFrame(raw,clock){
 if(!raw||!Number.isFinite(raw.t)||raw.t<0)throw Error('Expected frame.t in seconds');
 const origin=clock.origin??raw.t,t=Math.round((raw.t-origin)*1000)/1000;
 if(t<=clock.last)throw Error('Frame timestamps must strictly increase');
 if(t>STREAM_LIMIT)return null;
 const frame=cleanFrame({...raw,t});
 if(frame.scoreboard?.timer!==undefined)frame.scoreboard.timer=Number(frame.scoreboard.timer);
 clock.origin=origin;clock.last=t;return frame;
}
export function parseLines(chunk,partial=''){
 const lines=(partial+chunk).split('\n'),rest=lines.pop();
 if(rest.length>LINE_LIMIT||lines.some(l=>l.length>LINE_LIMIT))throw Error('NDJSON line too large');
 return {lines:lines.filter(l=>l.trim()).map(l=>JSON.parse(l)),rest};
}
export function takeBatch(queue,elapsed,id,seq){
 const frames=[];
 while(queue.length&&frames.length<24&&queue[0].t<=elapsed){
  const f=queue[0];if(frames.length&&f.t-frames[0].t>.45)break;
  if(new TextEncoder().encode(JSON.stringify({id,seq,frames:[...frames,f]})).length>MAX_PACKET){if(!frames.length)throw Error('Frame exceeds packet limit');break}
  frames.push(queue.shift());
 }
 return {id,seq,frames};
}
async function main(){
 const args=process.argv.slice(2);
 if(args.includes('--self-test')){
  const c={origin:null,last:-1},q=[];
  for(let i=0;i<120;i++)q.push(normalizeFrame({t:5+i/60,players:[{id:1,team:'Home',cf:[1,2,3],username:'hidden',abilitySlots:[1]}],scoreboard:{home:0,away:0,timer:300}},c));
  let seq=0,lastT=-1,total=0;
  while(q.length){const p=takeBatch(q,5,'test',seq);cleanBatch(p,{id:'test',seq,lastT});if(p.frames.some(f=>f.players[0].username||f.players[0].abilitySlots||f.scoreboard.timer!==300))throw Error('Privacy test failed');lastT=p.frames.at(-1).t;total+=p.frames.length;seq++}
  if(total!==120||seq!==5||parseLines('{"t":1}\n{"t":').rest!=='{"t":')throw Error('Batch/parser test failed');
  console.log('Local publisher self-test passed: 120 samples, 5 catch-up batches');return;
 }
 const path=args.find(a=>!a.startsWith('--'));
 if(!path||!args.includes('--consent'))throw Error('Usage: node local-publisher.mjs <authorized.ndjson> --consent [--once] [--delay=3]');
 const once=args.includes('--once'),delay=Number(args.find(a=>a.startsWith('--delay='))?.split('=')[1]??3);
 if(!Number.isFinite(delay)||delay<1||delay>10)throw Error('Delay must be 1–10 seconds');
 const token=process.env.LIVE_DEMO_TOKEN;
 if(!token||token.length<32)throw Error('Set LIVE_DEMO_TOKEN securely in your shell');
 const origin=new URL(process.env.LIVE_DEMO_URL||'https://blr-live-demo.scp343hey.workers.dev');
 if(origin.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(origin.hostname))throw Error('HTTPS required');
 if(origin.username||origin.password)throw Error('URL must not contain credentials');
 const room=randomBytes(16).toString('hex'),watch='https://blr.n29.kz/replays/?live=personal&room='+room;
 const file=await open(path,'r');
 if(!(await file.stat()).isFile()){await file.close();throw Error('Select a regular file')}
 const decoder=new TextDecoder('utf-8',{fatal:true}),buf=Buffer.alloc(4096),queue=[],clock={origin:null,last:-1};
 let offset=0,partial='',running=true,eof=false,limited=false,session=null,seq=0,total=0,lastSend=0,startedAt=0,lastLog=0;
 process.on('SIGINT',()=>{running=false});process.on('SIGTERM',()=>{running=false});
 function enqueue(raw){
  const f=normalizeFrame(raw,clock);if(f===null){limited=true;return}
  if(queue.length>=MAX_QUEUE)throw Error('Source backlog exceeded');
  queue.push(f);
 }
 async function read(){
  if(eof||limited||queue.length>=MAX_QUEUE-256)return;
  if((await file.stat()).size<offset)throw Error('Source truncated; start a new stream');
  const {bytesRead}=await file.read(buf,0,buf.length,offset);offset+=bytesRead;
  if(!bytesRead){
   if(once){eof=true;const final=partial+decoder.decode();if(final.trim())enqueue(JSON.parse(final));partial=''}
   return;
  }
  const parsed=parseLines(decoder.decode(buf.subarray(0,bytesRead),{stream:true}),partial);partial=parsed.rest;
  for(const raw of parsed.lines){enqueue(raw);if(limited)break}
 }
 async function request(action,body){
  const res=await fetch(new URL('/stream/'+room+'/'+action,origin),{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(4000)});
  if(!res.ok){const e=new Error(action+' failed: HTTP '+res.status);e.status=res.status;throw e}return res.json();
 }
 try{
  console.log('Waiting for authorized samples in '+path+' (Ctrl+C to stop)');
  while(running&&!queue.length&&!eof){await read();if(!queue.length)await sleep(50)}
  if(!running||!queue.length)return;
  session=await request('start',{consent:true});startedAt=performance.now();lastSend=startedAt;
  console.log('Watch: '+watch+'\nConfigured source delay: '+delay+'s; share only with intended viewers.');
  while(running){
   await read();const now=performance.now(),elapsed=(now-startedAt)/1000-delay;
   if((eof||limited)&&!queue.length)break;
   if(now-lastSend>11000)throw Error('No samples sent for 11 seconds; stream stopped');
   if(queue.length&&queue[0].t<elapsed-10)throw Error('Source or connection is over 10 seconds behind; stopping');
   if(queue.length&&queue[0].t<=elapsed&&now-lastSend>=200){
    const payload=takeBatch(queue,elapsed,session.id,seq);
    if(payload.frames.length){
     let ack;
     try{ack=await request('batch',payload)}catch(e){if(!running)break;if(e.status&&e.status!==429&&e.status<500)throw e;await sleep(250);ack=await request('batch',payload)}
     if(!ack.accepted||ack.seq!==seq)throw Error('Invalid acknowledgement');
     total+=payload.frames.length;seq++;lastSend=now;
    }
   }
   if(now-lastLog>=5000){console.log('Sent '+total+' samples · queued '+queue.length+' · '+seq+' batches');lastLog=now}
   await sleep(10);
  }
 }finally{
  if(session){try{await request('stop',{})}catch{console.warn('Stop failed; server inactivity timeout will close room')}}
  await file.close();console.log('Stopped. Local source was not modified.');
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1});
