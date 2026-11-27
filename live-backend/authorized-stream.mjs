// Authorized, opt-in personal spectator stream. Separate from the synthetic demo.
// Never accepts Roblox account IDs, names, chat, camera or private cooldown telemetry.
export const STREAM_LIMIT=600, MAX_PACKET=96000, MAX_FRAMES=24, HISTORY=25;
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const whole=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const coords=v=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=10000);
const num=v=>Math.round(v*64)/64;
const cleanPosition=v=>v.map(num);
export function cleanFrame(f){
 if(!f||!Number.isFinite(f.t)||f.t<0||f.t>STREAM_LIMIT||!Array.isArray(f.players)||f.players.length>32)throw Error('Invalid frame');
 const seen=new Set(),players=[];
 for(const p of f.players){
  if(!p||!whole(p.id,1,128)||seen.has(p.id)||!['Home','Away'].includes(p.team)||!coords(p.cf))throw Error('Invalid participant');
  seen.add(p.id);const row={id:p.id,team:p.team,cf:cleanPosition(p.cf),hasBall:p.hasBall===true};
  // Public-facing state only. Style labels are restricted to short display strings.
  if(typeof p.style==='string'&&/^[a-zA-Z0-9 .'-]{1,40}$/.test(p.style))row.style=p.style;
  if(typeof p.inAwakening==='boolean')row.inAwakening=p.inAwakening;
  if([0,1,2].includes(p.awk))row.awk=p.awk;
  players.push(row);
 }
 const out={t:Math.round(f.t*1000)/1000,players};
 if(f.ball&&coords(f.ball.cf)){out.ball={cf:cleanPosition(f.ball.cf),state:'free'};if(seen.has(f.ball.owner)){out.ball.owner=f.ball.owner;out.ball.state='held'}}
 if(f.scoreboard&&whole(f.scoreboard.home,0,999)&&whole(f.scoreboard.away,0,999)){out.scoreboard={home:f.scoreboard.home,away:f.scoreboard.away};if(whole(f.scoreboard.timer,0,3600))out.scoreboard.timer=String(f.scoreboard.timer)}
 if(Array.isArray(f.playerScoreboard)&&f.playerScoreboard.length<=32){
  const rows=[],ids=new Set();
  for(const p of f.playerScoreboard){
   const actor=players.find(a=>a.id===p?.id);if(!actor||ids.has(p.id))continue;ids.add(p.id);
   const row={id:p.id,team:actor.team};
   if(typeof p.position==='string'&&/^[A-Z][A-Z0-9]{0,7}$/.test(p.position))row.position=p.position;
   for(const k of ['Points','Goals','Assists','Saves','Steals'])if(whole(p[k],0,1000000))row[k]=p[k];
   rows.push(row);
  }
  out.playerScoreboard=rows;
 }
 return out;
}
export function cleanBatch(body,state){
 if(!body||body.id!==state.id||!whole(body.seq,0,100000)||!Array.isArray(body.frames)||!body.frames.length||body.frames.length>MAX_FRAMES)throw Error('Invalid packet');
 if(body.seq!==state.seq)throw Error('Unexpected sequence');
 const frames=body.frames.map(cleanFrame);
 let last=state.lastT??-1;
 for(const f of frames){if(f.t<=last)throw Error('Nonmonotonic timestamp');last=f.t}
 if(frames.at(-1).t-frames[0].t>.5)throw Error('Batch time range too large');
 return {type:'batch',id:state.id,seq:body.seq,frames};
}
async function bodyJSON(request){
 const reader=request.body?.getReader();if(!reader)throw Error('Missing body');
 const chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_PACKET){await reader.cancel();throw Error('Packet too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 return JSON.parse(new TextDecoder().decode(bytes));
}
function status(room){return {id:room.state.id,active:room.state.active===true,kind:'authorized',hz:60,viewers:room.ctx.getWebSockets().length,seq:room.state.seq||0}}
export async function stopAuthorized(room){
 if(room.state.active){await room.save({...room.state,active:false});room.broadcast({type:'end',...status(room)})}
 await room.ctx.storage.deleteAlarm();
 // Remove stored telemetry on stop/expiry; connected spectators retain their local rewind buffer.
 const keys=await room.ctx.storage.list({prefix:'stream:'});if(keys.size)await room.ctx.storage.delete([...keys.keys()]);
 return reply(status(room));
}
export async function watchAuthorized(room,request){
 if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return reply({error:'WebSocket required'},426);
 if(room.ctx.getWebSockets().length>=50)return reply({error:'Room full'},503);
 const [client,server]=Object.values(new WebSocketPair());room.ctx.acceptWebSocket(server);
 server.send(JSON.stringify({type:'hello',...status(room),format:'json'}));
 if(room.state.active){
  const history=await room.ctx.storage.list({prefix:'stream:'});
  for(const value of history.values())server.send(value);
 }
 room.broadcast({type:'viewers',count:room.ctx.getWebSockets().length});
 return new Response(null,{status:101,webSocket:client});
}
export async function handleAuthorized(room,request,action){
 if(action==='watch')return watchAuthorized(room,request);
 if(action==='start'){
  const body=await bodyJSON(request);
  if(body?.consent!==true)return reply({error:'Authorized participant consent required'},400);
  if(room.state.active)return reply({error:'Already active'},409);
  const state={id:crypto.randomUUID(),startedAt:Date.now(),seq:0,active:true,kind:'authorized',lastT:-1,lastBatchAt:0,windowAt:Date.now(),windowCount:0};
  await room.save(state);await room.ctx.storage.setAlarm(Date.now()+15000);
  room.broadcast({type:'start',...status(room)});return reply(status(room));
 }
 if(action==='stop')return stopAuthorized(room);
 if(action!=='batch')return reply({error:'Not found'},404);
 const s=room.state;
 if(!s.active||s.kind!=='authorized')return reply({error:'Not active'},409);
 const now=Date.now();
 if(now-s.startedAt>STREAM_LIMIT*1000+15000){await stopAuthorized(room);return reply({error:'Time limit'},409)}
 const body=await bodyJSON(request);
 if(body.id===s.id&&body.seq===s.seq-1)return reply({accepted:true,seq:body.seq,duplicate:true});
 const windowAt=now-s.windowAt>=1000?now:s.windowAt,windowCount=windowAt===s.windowAt?s.windowCount:0;
 if(windowCount>=8)return reply({error:'Rate limited'},429);
 const batch=cleanBatch(body,s);
 if(batch.frames.at(-1).t>(now-s.startedAt)/1000+2)return reply({error:'Timestamp ahead of live clock'},400);
 const key='stream:'+String(batch.seq).padStart(6,'0'),old='stream:'+String(batch.seq-HISTORY).padStart(6,'0');
 const next={...s,seq:s.seq+1,lastT:batch.frames.at(-1).t,lastBatchAt:now,windowAt,windowCount:windowCount+1};
 // Persist batch and sequence together so retry/reconnect remains consistent.
 await room.ctx.storage.transaction(async txn=>{await txn.put(key,JSON.stringify(batch));await txn.put('state',next);if(batch.seq>=HISTORY)await txn.delete(old)});
 room.state=next;await room.ctx.storage.setAlarm(now+15000);room.broadcast(batch);return reply({accepted:true,seq:batch.seq});
}
