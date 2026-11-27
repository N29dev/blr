// Replay Studio Live, synthetic-only backend prototype.
// No game client ingestion, player identifiers, or arbitrary frame uploads.
import { DurableObject } from 'cloudflare:workers';
export const HZ=60, BATCH=6, MAX_BATCHES=6000, HISTORY_BATCHES=50;
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const fresh=()=>({id:null,startedAt:0,seq:0,active:false});
export function syntheticFrame(n){
 const t=n/HZ;
 const players=Array.from({length:16},(_,i)=>{
  const home=i<8,j=i%8,side=home?-1:1;
  return {id:i+1,team:home?'Home':'Away',hasBall:false,
   cf:[side*(25+30*(j%4))+18*Math.sin(t*.8+j),11.17,(Math.floor(j/4)*2-1)*55+15*Math.cos(t*.7+j),0,home?Math.PI/2:-Math.PI/2,0]};
 });
 return {t,players,ball:{state:'free',cf:[120*Math.sin(t*.6),11.17+12*Math.abs(Math.sin(t*1.8)),65*Math.cos(t*.6)]},
  scoreboard:{home:0,away:0,timer:String(Math.max(0,300-Math.floor(t)))}};
}
export function batchFor(seq){
 if(!Number.isSafeInteger(seq)||seq<0||seq>=MAX_BATCHES)throw new RangeError('Invalid batch index');
 return Array.from({length:BATCH},(_,i)=>syntheticFrame(seq*BATCH+i));
}
async function allowed(request,env){
 const expected=env.LIVE_DEMO_TOKEN,actual=request.headers.get('Authorization');
 if(typeof expected!=='string'||expected.length<32||!actual?.startsWith('Bearer ')||actual.length>512)return false;
 const enc=new TextEncoder();
 const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(actual.slice(7))),crypto.subtle.digest('SHA-256',enc.encode(expected))]);
 let diff=0;const x=new Uint8Array(a),y=new Uint8Array(b);for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
export class LiveDemoRoom extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.state=fresh();ctx.blockConcurrencyWhile(async()=>{this.state=await ctx.storage.get('state')||fresh()})}
 async save(next){await this.ctx.storage.put('state',next);this.state=next}
 broadcast(message){const data=JSON.stringify(message);for(const ws of this.ctx.getWebSockets())try{ws.send(data)}catch{try{ws.close(1011,'Disconnected')}catch{}}}
 status(){return {...this.state,kind:'synthetic',hz:HZ,batchSize:BATCH,viewers:this.ctx.getWebSockets().length}}
 async start(){
  if(this.state.active)return json(this.status(),409);
  await this.save({id:crypto.randomUUID(),startedAt:Date.now(),seq:0,active:true});
  await this.ctx.storage.setAlarm(Date.now()+MAX_BATCHES*100+15000);
  this.broadcast({type:'start',...this.status()});return json(this.status());
 }
 async tick(){
  const s=this.state;if(!s.active)return json({error:'Demo is not active'},409);
  // Server-clock pacing prevents a producer from flooding the room.
  if(Date.now()-s.startedAt<s.seq*100)return json({error:'Too early'},429);
  const seq=s.seq;if(seq>=MAX_BATCHES){await this.stop();return json({error:'Demo reached time limit'},409)}
  await this.save({...s,seq:seq+1});
  this.broadcast({type:'batch',id:s.id,seq,frames:batchFor(seq)});
  if(this.state.seq>=MAX_BATCHES)await this.stop();
  return json({id:s.id,seq,accepted:true});
 }
 async stop(){
  if(this.state.active){await this.save({...this.state,active:false});this.broadcast({type:'end',...this.status()})}
  await this.ctx.storage.deleteAlarm();return json(this.status());
 }
 async alarm(){await this.stop()}
 async watch(request){
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket required'},426);
  if(this.ctx.getWebSockets().length>=100)return json({error:'Demo room full'},503);
  const [client,server]=Object.values(new WebSocketPair());
  this.ctx.acceptWebSocket(server);
  const s=this.state;
  server.send(JSON.stringify({type:'hello',...this.status(),historyStart:Math.max(0,s.seq-HISTORY_BATCHES)}));
  for(let seq=Math.max(0,s.seq-HISTORY_BATCHES);seq<s.seq;seq++)server.send(JSON.stringify({type:'batch',id:s.id,seq,frames:batchFor(seq)}));
  this.broadcast({type:'viewers',count:this.ctx.getWebSockets().length});
  return new Response(null,{status:101,webSocket:client});
 }
 webSocketMessage(ws){ws.close(1008,'Read-only spectator')}
 webSocketClose(){this.broadcast({type:'viewers',count:this.ctx.getWebSockets().length})}
 webSocketError(ws){try{ws.close(1011,'WebSocket error')}catch{}}
 // Request routing stays inside the room so concurrent mutations can be serialized.
 async fetch(request){
  const action=new URL(request.url).pathname.split('/').at(-1);
  if(action==='watch')return this.watch(request);
  if(action==='status')return json(this.status());
  if(!await allowed(request,this.env))return json({error:'Unauthorized'},401);
  // A single in-object queue serializes async writes across start/tick/stop.
  const previous=this.pending||Promise.resolve();
  const next=previous.catch(()=>{}).then(()=>action==='start'?this.start():action==='tick'?this.tick():action==='stop'?this.stop():json({error:'Not found'},404));
  this.pending=next;return next;
 }
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(!/^\/demo\/(status|watch|start|tick|stop)$/.test(path))return json({error:'Not found'},404);
 const read=/\/(status|watch)$/.test(path);
 if(request.method!==(read?'GET':'POST'))return json({error:'Method not allowed'},405);
 // Only the synthetic demo room exists in this prototype.
 return env.LIVE_DEMO.getByName('synthetic-demo').fetch(request);
}};
