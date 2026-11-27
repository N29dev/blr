// Bridge for developer-authorized, opt-in v0.15 Lite JSON recordings.
// Watches a user-selected recording root, only a new session, and reads committed chunks.
// No game process access. No modifications to source recordings or Lua instrumentation.
import {readdir,lstat,readFile,mkdtemp,open,writeFile,rm} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {cleanFrame} from './authorized-stream.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const maxBytes=16*1024*1024;
const ownFile=async(path,limit=maxBytes)=>{
 try{const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.size>limit)throw Error('Invalid source file: '+path);return st}
 catch(e){if(e.code==='ENOENT')return null;throw e}
};
async function json(path,limit=maxBytes){
 if(!await ownFile(path,limit))return null;
 try{return JSON.parse(await readFile(path,'utf8'))}catch(e){if(e instanceof SyntaxError||e.code==='ENOENT')return null;throw e}
}
function number(v){
 if(typeof v==='number')return v;
 if(typeof v==='string'&&/^\s*\d+\s*$/.test(v))return Number(v);
 return undefined;
}
function timer(v){
 const n=number(v);if(n!==undefined)return n;
 if(typeof v==='string'){const m=v.trim().match(/^(\d{1,2}):(\d{2})$/);if(m&&Number(m[2])<60)return Number(m[1])*60+Number(m[2])}
}
const pos=cf=>Array.isArray(cf)&&cf.length>=3?cf.slice(0,3):undefined;
export function convertFrame(f,states,labels=new Map()){
 if(!f||!Array.isArray(f.players)||!Number.isFinite(f.t))throw Error('Invalid Lite frame');
 const players=f.players.map(p=>{
  const old=states.get(p.id)||{};
  if(typeof p.style==='string')old.style=p.style;
  if(Number.isInteger(p.awk))old.awk=p.awk;
  if(typeof p.inAwakening==='boolean')old.inAwakening=p.inAwakening;
  states.set(p.id,old);
  return {id:p.id,team:p.team,cf:pos(p.cf),hasBall:p.hasBall,...old,label:labels.get(String(p.id))};
 });
 const present=new Set(players.map(p=>p.id));
 for(const id of states.keys())if(!present.has(id))states.delete(id);
 const raw={t:f.t,players};
 if(f.ball&&pos(f.ball.cf))raw.ball={cf:pos(f.ball.cf),owner:f.ball.owner};
 if(f.scoreboard)raw.scoreboard={home:number(f.scoreboard.home),away:number(f.scoreboard.away),timer:timer(f.scoreboard.timer)};
 if(Array.isArray(f.playerScoreboard))raw.playerScoreboard=f.playerScoreboard;
 const out=cleanFrame(raw);
 // The publishing API expects the timer as a number.
 if(out.scoreboard?.timer!==undefined)out.scoreboard.timer=Number(out.scoreboard.timer);
 return out;
}
export function selfTest(){
 const states=new Map();
 const f=convertFrame({t:0,players:[{id:1,team:'Home',cf:[1,2,3,0,0,0],style:'Nagi',awk:2,username:'ignored',abilitySlots:[1]}],camera:{},ball:{cf:[4,5,6,0,0,0],owner:1},scoreboard:{home:'2',away:'1',timer:'2:15'},playerScoreboard:[{id:1,team:'Home',position:'GK',Saves:3,Ping:120}]},states);
 const g=convertFrame({t:0.033,players:[{id:1,team:'Home',cf:[2,3,4,0,0,0]}]},states);
 if(f.ball.cf.length!==3||f.scoreboard.timer!==135||f.scoreboard.home!==2||f.players[0].username||f.players[0].abilitySlots||f.camera||f.playerScoreboard[0].Ping||g.players[0].style!=='Nagi'||g.players[0].awk!==2)throw Error('Lite schema conversion failed');
 const named=convertFrame({t:.066,players:[{id:1,team:'Home',cf:[1,2,3]}]},states,new Map([['1','Example_Player']]));
 if(named.players[0].label!=='Example_Player'||f.players[0].label!==undefined)throw Error('Optional username test failed');
 console.log('Chunk adapter self-test passed');
}
async function main(){
 const args=process.argv.slice(2);
 if(args.includes('--self-test'))return selfTest();
 const input=args.find(a=>!a.startsWith('--'));
 if(!input||!args.includes('--consent'))throw Error('Usage: node chunk-publisher.mjs <ReplayRecordings folder> --consent [--session] [--usernames | --labels=FILE]');
 if(!process.env.LIVE_DEMO_TOKEN||process.env.LIVE_DEMO_TOKEN.length<32)throw Error('Set LIVE_DEMO_TOKEN first');
 const labelPath=args.find(a=>a.startsWith('--labels='))?.slice(9);
 const allNames=args.includes('--usernames');
 if(allNames&&labelPath)throw Error('Choose --usernames or --labels, not both');
 const approved=new Map();
 if(labelPath){
  const mapping=await json(resolve(labelPath),65536);
  if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Expected JSON object of consenting usernames and chosen display labels');
  for(const [username,label] of Object.entries(mapping)){
   if(!/^[A-Za-z0-9_]{1,20}$/.test(username)||typeof label!=='string'||!/^[\p{L}\p{M}\p{N} _.'-]{1,32}$/u.test(label)||!label.trim())throw Error('Invalid approved label mapping');
   approved.set(username.toLowerCase(),label.trim());
  }
 }
 const root=resolve(input),stat=await lstat(root);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Select a recording directory');
 const existing=new Set(await readdir(root));
 let running=true,child=null,done=null,exit=null,childError=null,work=null,out=null;
 function stop(){running=false;if(child&&exit===null)child.kill('SIGTERM')}
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 try{
  let session=args.includes('--session')?root:null;
  if(!session){
   console.log('Waiting for one new recording in '+root+'; start your approved recording now.');
   while(running&&!session){
    const candidates=(await readdir(root)).filter(n=>!existing.has(n)).sort();
    for(const n of candidates){
     const p=join(root,n),s=await lstat(p).catch(()=>null);
     if(!s?.isDirectory()||s.isSymbolicLink())continue;
     const m=await json(join(p,'metadata.json'),65536);
     if(m?.version===2&&m.recorderVersion==='0.15-lite'&&m.complete===false){session=p;break}
    }
    if(!session)await sleep(250);
   }
  }
  if(!running||!session)return;
  console.log('Selected: '+session+' (read-only)');
  if(allNames)console.log('Username sharing enabled for this authorized, consenting session.');
  work=await mkdtemp(join(tmpdir(),'blr-chunks-'));
  const data=join(work,'session.ndjson'),end=join(work,'done');
  out=await open(data,'wx',0o600);
  let next=1,lastT=-1,sessionId=null,lastActivity=Date.now(),started=false,finished=false;
  const states=new Map();
  while(running&&!finished){
   if(childError)throw childError;
   if(child&&exit!==null)throw Error('Publisher exited before source finished ('+exit+')');
   const m=await json(join(session,'metadata.json'),65536);
   if(m&&m.version===2&&m.recorderVersion==='0.15-lite'&&typeof m.id==='string'&&Number.isInteger(m.chunks)&&m.chunks>=0&&m.chunks<=10000){
    if(sessionId&&m.id!==sessionId)throw Error('Recording session changed');
    sessionId=m.id;
    // metadata is written after each complete chunk, so no partial chunk is uploaded.
    while(running&&next<=m.chunks){
     const f=await json(join(session,'chunk_'+String(next).padStart(6,'0')+'.json'));
     if(f===null)break;
     if(!Array.isArray(f)||f.length>1000)throw Error('Invalid chunk '+next);
     const labels=new Map();
     if(allNames||approved.size){
      const roster=await json(join(session,'players.json'),262144);
      if(roster&&typeof roster==='object')for(const [id,p] of Object.entries(roster)){
       if(p&&typeof p.username==='string'&&/^[A-Za-z0-9_]{1,20}$/.test(p.username)){if(allNames)labels.set(id,p.username);else if(approved.has(p.username.toLowerCase()))labels.set(id,approved.get(p.username.toLowerCase()))}
      }
     }
     let lines='';
     for(const raw of f){
      if(!Number.isFinite(raw?.t)||raw.t<=lastT)continue;
      if(raw.t>600){finished=true;break}
      const frame=convertFrame(raw,states,labels);lastT=raw.t;lines+=JSON.stringify(frame)+'\n';
     }
     if(lines){await out.writeFile(lines);lastActivity=Date.now()}
     next++;
     if(!started&&lines){
      const publisher=join(dirname(fileURLToPath(import.meta.url)),'local-publisher.mjs');
      child=spawn(process.execPath,[publisher,data,'--consent','--delay=3','--end-marker='+end],{stdio:['ignore','inherit','inherit']});
      started=true;
      done=new Promise(resolve=>{child.once('error',e=>{childError=e;exit='spawn-error';resolve()});child.once('close',(code,signal)=>{exit=code??signal??'unknown';resolve()})});
     }
     if(finished)break;
    }
    if(m.complete===true&&next>m.chunks)finished=true;
   }
   if(!finished&&Date.now()-lastActivity>20000)throw Error('No committed replay chunks for 20 seconds');
   if(!finished)await sleep(250);
  }
  if(running&&finished){
   await out.close();out=null;
   await writeFile(end,'',{flag:'wx',mode:0o600});
   console.log('Recording ended; draining buffered samples.');
   if(done)await done;
   if(childError)throw childError;
   if(exit!==null&&exit!==0)throw Error('Publisher exited: '+exit);
  }
 }finally{
  if(child&&exit===null){child.kill('SIGTERM');await done}
  if(out)await out.close();
  if(work)await rm(work,{recursive:true,force:true});
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1});
