// End-to-end personal room test using fictional telemetry only.
import {randomBytes} from 'node:crypto';
const url=new URL(process.env.LIVE_DEMO_URL||'https://blr-live-demo.scp343hey.workers.dev');
const token=process.env.LIVE_DEMO_TOKEN;
if(!token||token.length<32)throw Error('Set LIVE_DEMO_TOKEN first');
if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('HTTPS required');
const room=randomBytes(16).toString('hex'),seconds=Math.max(1,Math.min(600,Number(process.argv[2])||120));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let running=true;process.on('SIGINT',()=>{running=false});process.on('SIGTERM',()=>{running=false});
async function send(action,body){
 const r=await fetch(new URL('/stream/'+room+'/'+action,url),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error(action+' failed: '+r.status+' '+await r.text());return r.json();
}
function frame(n){
 const t=n/60,players=Array.from({length:16},(_,i)=>({id:i+1,team:i<8?'Home':'Away',cf:[(i<8?-1:1)*(40+25*(i%4))+20*Math.sin(t+i),11.17,-55+35*(i%4)+20*Math.cos(t*.5+i)],style:i%2?'Nagi':'Isagi',awk:i===1&&t%20<5?2:0}));
 return {t,players,ball:{cf:[90*Math.sin(t),11.17,65*Math.cos(t)]},scoreboard:{home:Math.floor(t/30),away:0,timer:Math.max(0,300-Math.floor(t))},...(n%60===0?{playerScoreboard:players.map(p=>({id:p.id,position:p.id===1||p.id===9?'GK':'CF',Goals:p.id===2?Math.floor(t/30):0}))}:{})};
}
const session=await send('start',{consent:true});
console.log('Personal synthetic test — share only with intended spectators:');
console.log('https://blr.n29.kz/replays/?live=personal&room='+room);
try{
 const start=performance.now();let seq=0,n=0;
 while(running&&n<seconds*60){
  const end=Math.min(n+12,Math.ceil(seconds*60));
  await sleep(Math.max(0,start+end/60*1000-performance.now()));
  const payload={id:session.id,seq,frames:Array.from({length:end-n},(_,i)=>frame(n+i))};
  try{await send('batch',payload)}catch{await sleep(150);await send('batch',payload)}
  seq++;n=end;
 }
}finally{await send('stop',{})}
