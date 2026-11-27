// Write a fictional NDJSON match for local publisher testing. No real player data.
import {open} from 'node:fs/promises';
const path=process.argv[2]||'local-demo.ndjson';
const seconds=Math.min(600,Math.max(1,Number(process.argv[3])||60));
const live=process.argv.includes('--live'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out=await open(path,'wx');
try{
 const start=performance.now(),count=Math.ceil(seconds*60);
 for(let n=0;n<count;){
  const end=Math.min(n+12,count);
  if(live)await sleep(Math.max(0,start+end/60*1000-performance.now()));
  let lines='';
  for(;n<end;n++){
   const t=n/60,players=Array.from({length:16},(_,i)=>({id:i+1,team:i<8?'Home':'Away',cf:[(i<8?-1:1)*(40+25*(i%4))+20*Math.sin(t+i),11.17,-55+35*(i%4)+20*Math.cos(t*.5+i)],style:i%2?'Nagi':'Isagi'}));
   lines+=JSON.stringify({t,players,ball:{cf:[90*Math.sin(t),11.17,65*Math.cos(t)]},scoreboard:{home:Math.floor(t/30),away:0,timer:Math.max(0,300-Math.floor(t))}})+'\n';
  }
  await out.writeFile(lines);
 }
}finally{await out.close()}
console.log('Synthetic source written: '+path);
