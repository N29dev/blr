/* AI keepers remain in some recordings when the game parks their models outside the pitch.
 * Filter their samples, not human keepers or the entire NPC identity.
 * The generous bounds are a display/analysis heuristic, not an official game rule.
 */
function replayNpc(p,roster={}){return p?.kind==='npc'||roster[String(p?.id)]?.kind==='npc'}
function replayActiveActor(p,geometry,roster={}){
 if(!p)return false;
 if(!replayNpc(p,roster))return true;
 const cf=p.cf,b=geometry.bounds,y=geometry.characterRestYApprox??geometry.illustrativeGroundY??7;
 if(!Array.isArray(cf)||cf.length<3||!cf.slice(0,3).every(Number.isFinite))return false;
 return cf[1]>=y-35&&cf[1]<=y+80&&cf[0]>=b.minX-60&&cf[0]<=b.maxX+60&&cf[2]>=b.minZ-60&&cf[2]<=b.maxZ+60;
}
function replayActiveFrames(frames,geometry,roster={}){
 return frames.map(f=>{const ps=f.players||[];const players=ps.filter(p=>replayActiveActor(p,geometry,roster));return players.length===ps.length?f:{...f,players};});
}
function replayActiveRosterIds(frames,roster={}){
 const observed=new Set();for(const f of frames)for(const p of f.players||[])observed.add(String(p.id));
 return [...new Set([...Object.keys(roster).filter(id=>roster[id]?.kind!=='npc'||observed.has(id)),...observed])].sort((a,b)=>Number(a)-Number(b));
}
/* Offline, time-weighted match analytics. Never imputes unobserved possession or movement. */
function analyzeReplay(frames,geometry,options={}){
 const nx=36,nz=27,b=geometry.bounds,dx=b.maxX-b.minX,dz=b.maxZ-b.minZ,actors=new Map(),ballHeat=new Float64Array(nx*nz),teams={Home:0,Away:0,free:0,unknown:0};
 const start=Number.isFinite(options.start)?options.start:frames[0]?.t??0,end=Number.isFinite(options.end)?options.end:frames.at(-1)?.t??start;
 const onField=cf=>Array.isArray(cf)&&Number.isFinite(cf[0])&&Number.isFinite(cf[2])&&cf[0]>=b.minX&&cf[0]<=b.maxX&&cf[2]>=b.minZ&&cf[2]<=b.maxZ;
 const bin=cf=>Math.min(nz-1,Math.floor((cf[2]-b.minZ)/dz*nz))*nx+Math.min(nx-1,Math.floor((cf[0]-b.minX)/dx*nx));
 const restY=geometry.characterRestYApprox??geometry.illustrativeGroundY??7;
 const active=p=>p&&(p.team==='Home'||p.team==='Away')&&replayActiveActor(p,geometry,options.roster||{})&&onField(p.cf)&&Number.isFinite(p.cf[1])&&p.cf[1]>=restY-35&&p.cf[1]<=restY+80;
 const localId=options.localId==null?null:String(options.localId);const cut=f=>f?.localStats?.InCutscene===true||(localId!==null&&f.players?.some(p=>String(p.id)===localId&&p.states?.InCutscene===true));
 const idFor=p=>String(p.id);
 function get(p){const id=idFor(p);if(!actors.has(id)&&actors.size>=128){actorLimit=true;return null}if(!actors.has(id))actors.set(id,{id,team:p.team,kind:p.kind,seconds:0,held:0,distance:0,moveSeconds:0,excluded:0,maxSpeed:0,x:0,z:0,heat:new Float64Array(nx*nz),heldHeat:new Float64Array(nx*nz),withoutHeat:new Float64Array(nx*nz),teamSeconds:{Home:0,Away:0},counters:Object.create(null),styles:new Set(),flows:new Set()});return actors.get(id)}
 const statKeys=['Goals','Assists','Saves','Steals','AnkleBreakers','FilteredPasses','Points'];
 const baselines=new Map();let covered=0,gapSeconds=0,ballSeconds=0,actorLimit=false;
 for(let i=0;i<frames.length-1;i++){
  const f=frames[i],next=frames[i+1],raw=next.t-f.t,dt=Math.min(end,next.t)-Math.max(start,f.t);
  if(!(dt>0))continue;
  if(raw>.25||cut(f)||cut(next)){gapSeconds+=dt;continue}
  covered+=dt;
  const present=new Map((f.players||[]).filter(active).map(p=>[idFor(p),p])),after=new Map((next.players||[]).filter(active).map(p=>[idFor(p),p]));
  const holders=[...present.values()].filter(p=>p.hasBall===true),owner=f.ball?.state==='held'&&f.ball.owner!=null?present.get(String(f.ball.owner)):null;
  const possessor=owner||(f.ball?.state==='held'&&holders.length===1?holders[0]:null);
  const phase=possessor?possessor.team:f.ball?.state==='free'?'free':'unknown';teams[phase]+=dt;
  if(onField(f.ball?.cf)){ballHeat[bin(f.ball.cf)]+=dt;ballSeconds+=dt}
  for(const p of present.values()){
   const a=get(p);if(!a)continue;const k=bin(p.cf);a.seconds+=dt;a.teamSeconds[p.team]+=dt;a.x+=p.cf[0]*dt;a.z+=p.cf[2]*dt;a.heat[k]+=dt;
   if(possessor&&idFor(possessor)===a.id){a.held+=dt;a.heldHeat[k]+=dt}else if(phase!=='unknown')a.withoutHeat[k]+=dt;
   const q=after.get(a.id);if(!q||q.team!==p.team||q.replaySessionId!==p.replaySessionId){a.excluded+=dt;continue}
   const distance=Math.hypot(q.cf[0]-p.cf[0],q.cf[2]-p.cf[2]),speed=distance/raw;
   if(!Number.isFinite(speed)||speed>160){a.excluded+=dt;continue}
   a.distance+=speed*dt;a.moveSeconds+=dt;a.maxSpeed=Math.max(a.maxSpeed,speed);
  }
 }
 // Counter deltas are scoped to the selected period; missing fields are not zero.
 const identity=new Map();
 for(const f of frames){
  if(f.t>end)break;
  const rows=[];
  for(const p of f.players||[])if(typeof p.style==='string'&&p.style.length>0&&p.style.length<=128)rows.push([String(p.id),{Style:p.style}]);
  if(localId!==null&&f.localStats&&typeof f.localStats==='object')rows.push([localId,f.localStats]);
  for(const [id,v] of rows){
   const a=actors.get(id);if(!a)continue;
   if(!identity.has(id))identity.set(id,{});const info=identity.get(id);if(typeof v.Style==='string'&&v.Style)info.style=v.Style.slice(0,100);if(typeof v.Flow==='string'&&v.Flow)info.flow=v.Flow.slice(0,100);if(f.t>=start){if(info.style)a.styles.add(info.style);if(info.flow)a.flows.add(info.flow)}
   if(!baselines.has(id))baselines.set(id,Object.create(null));const previous=baselines.get(id);
   for(const k of statKeys){const n=v[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0)continue;
    if(f.t>=start&&previous[k]!=null&&n>=previous[k])a.counters[k]=(a.counters[k]??0)+n-previous[k];
    else if(f.t>=start&&previous[k]!=null&&n<previous[k]){if(a.counters[k]==null)a.counters[k]=0}
    previous[k]=n;
   }
  }
 }
 // Remote-player counter credits are stored as sparse events, not per-frame snapshots.
 // Keep local snapshot-based counts for legacy and new recordings; never count them twice.
 const remoteCounters={goal_credit:'Goals',assist:'Assists',save:'Saves',steal:'Steals',ankle_break:'AnkleBreakers',pass_count:'FilteredPasses'};
 for(const f of frames){
  if(f.t>end+.1)break;
  if(!Array.isArray(f.events))continue;
  for(const e of f.events){
   if(!e||e.source!=='counter'||!Object.hasOwn(remoteCounters,e.type)||!Number.isFinite(e.t)||e.t<start||e.t>end||Math.abs(e.t-f.t)>.1||!Number.isSafeInteger(e.delta)||e.delta<=0)continue;
   const id=String(e.playerId);if(id===localId)continue;
   const a=actors.get(id);if(!a||replayNpc(a,options.roster||{}))continue;
   const key=remoteCounters[e.type];a.counters[key]=(a.counters[key]??0)+e.delta;
  }
 }
 for(const a of actors.values()){if(!a.styles.size&&identity.get(a.id)?.style)a.styles.add(identity.get(a.id).style);if(!a.flows.size&&identity.get(a.id)?.flow)a.flows.add(identity.get(a.id).flow);a.average=a.seconds?[a.x/a.seconds,a.z/a.seconds]:null;a.team=a.teamSeconds.Home&&a.teamSeconds.Away?'Mixed':a.teamSeconds.Home?'Home':'Away'}
 return {actors,teams,covered,gapSeconds,ballHeat,ballSeconds,nx,nz,start,end,actorLimit};
}

/* Offline import repair: merge only non-overlapping sessions with the same recorded username.
 * Keep session IDs on samples so movement and state never bridge a reconnect. */
function replayReconcileIdentities(frames,roster){
 const spans=new Map(),groups=new Map(),map=new Map();
 for(const f of frames)for(const p of f.players||[]){
  const id=String(p.id),v=spans.get(id);
  if(v)v.end=f.t;else spans.set(id,{start:f.t,end:f.t});
 }
 for(const [id,p] of Object.entries(roster)){
  if(p.kind==='npc'||typeof p.username!=='string'||!p.username.trim()||!spans.has(id))continue;
  const key=p.username.trim().toLowerCase();
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);
 }
 for(const ids of groups.values()){
  ids.sort((a,b)=>spans.get(a).start-spans.get(b).start);
  if(ids.length<2||ids.some((id,i)=>i>0&&spans.get(id).start<=spans.get(ids[i-1]).end))continue;
  for(const id of ids.slice(1))map.set(id,ids[0]);
 }
 if(!map.size)return {frames,roster,merged:0};
 const remap=id=>map.get(String(id))??id;
 const session=p=>p&&p.id!=null?({...p,id:remap(p.id),replaySessionId:String(p.id)}):p;
 const result=frames.map(f=>({...f,players:(f.players||[]).map(session),
  ...(f.ball?.owner!=null?{ball:{...f.ball,owner:remap(f.ball.owner)}}:{}),
  ...(Array.isArray(f.playerScoreboard)?{playerScoreboard:f.playerScoreboard.map(session)}:{}),
  ...(Array.isArray(f.events)?{events:f.events.map(e=>e?.playerId!=null?{...e,playerId:remap(e.playerId)}:e)}:{})
 }));
 const next=Object.assign(Object.create(null),roster);for(const id of map.keys())delete next[id];
 return {frames:result,roster:next,merged:map.size,idMap:map};
}
function replayPositionHistory(frames){
 const known=new Map(),out=[];
 for(const f of frames){
  if(!Array.isArray(f.playerScoreboard))continue;
  const rows=f.playerScoreboard.map(p=>{
   if(!p)return p;
   const key=String(p.replaySessionId??p.id)+'|'+p.team;
   if(typeof p.position==='string'&&/^[A-Z][A-Z0-9]{0,11}$/.test(p.position)){
    known.set(key,{position:p.position,t:f.t});return p;
   }
   const last=known.get(key);
   // Only short gaps; no backwards filling or guesses from geometry.
   return last&&f.t-last.t<=10?{...p,position:last.position,positionCarried:true}:p;
  });
  out.push({t:f.t,rows});
 }
 return out;
}
