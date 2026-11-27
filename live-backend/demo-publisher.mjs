// Node 22+ test publisher. Sends control commands only; the Worker generates synthetic frames.
// LIVE_DEMO_URL=https://your-worker.workers.dev LIVE_DEMO_TOKEN=... node demo-publisher.mjs
const origin=new URL(process.env.LIVE_DEMO_URL||'http://127.0.0.1:8787');
const token=process.env.LIVE_DEMO_TOKEN;
if(!token||token.length<32)throw Error('Set LIVE_DEMO_TOKEN (at least 32 characters).');
if(origin.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(origin.hostname))throw Error('Use HTTPS for remote publishing.');
const seconds=Math.min(600,Math.max(1,Number(process.argv[2])||20));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let running=true,started=false;
process.on('SIGINT',()=>{running=false});
process.on('SIGTERM',()=>{running=false});
async function command(action){
 const r=await fetch(new URL('/demo/'+action,origin),{method:'POST',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(5000)});
 if(r.status===429&&action==='tick')return null;
 if(!r.ok)throw Error(action+' failed: HTTP '+r.status);
 return r.json();
}
try{
 const session=await command('start');started=true;
 console.log('Synthetic session '+session.id+' · '+session.hz+' Hz · '+session.batchSize+' frames/batch');
 let deadline=performance.now();
 for(let i=0;i<Math.ceil(seconds*10)&&running;){
  await sleep(Math.max(0,deadline-performance.now()));
  const result=await command('tick');
  if(!result){await sleep(20);continue}
  i++;deadline+=100;
 }
}finally{
 if(started)await command('stop');
}
