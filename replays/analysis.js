/* Offline, time-weighted match analytics. Never imputes unobserved possession or movement. */
function analyzeReplay(frames,geometry,options={}){
 const nx=36,nz=27,b=geometry.bounds,dx=b.maxX-b.minX,dz=b.maxZ-b.minZ,actors=new Map(),ballHeat=new Float64Array(nx*nz),teams={Home:0,Away:0,free:0,unknown:0};
 const start=Number.isFinite(options.start)?options.start:frames[0]?.t??0,end=Number.isFinite(options.end)?options.end:frames.at(-1)?.t??start;
 const onField=cf=>Array.isArray(cf)&&Number.isFinite(cf[0])&&Number.isFinite(cf[2])&&cf[0]>=b.minX&&cf[0]<=b.maxX&&cf[2]>=b.minZ&&cf[2]<=b.maxZ;
 const bin=cf=>Math.min(nz-1,Math.floor((cf[2]-b.minZ)/dz*nz))*nx+Math.min(nx-1,Math.floor((cf[0]-b.minX)/dx*nx));
 const active=p=>p&&(p.team==='Home'||p.team==='Away')&&onField(p.cf);
 const cut=f=>f?.localStats?.InCutscene===true;
 const idFor=p=>String(p.id);
 function get(p){const id=idFor(p);if(!actors.has(id))actors.set(id,{id,team:p.team,kind:p.kind,seconds:0,held:0,distance:0,moveSeconds:0,excluded:0,maxSpeed:0,x:0,z:0,heat:new Float64Array(nx*nz),heldHeat:new Float64Array(nx*nz),withoutHeat:new Float64Array(nx*nz),teamSeconds:{Home:0,Away:0},counters:Object.create(null),styles:new Set(),flows:new Set()});return actors.get(id)}
 const statKeys=['Goals','Assists','Saves','Steals','AnkleBreakers','FilteredPasses','Points'];
 const baselines=new Map();let covered=0,gapSeconds=0,ballSeconds=0;
 for(let i=0;i<frames.length-1;i++){
  const f=frames[i],next=frames[i+1],raw=next.t-f.t,dt=Math.min(end,next.t)-Math.max(start,f.t);
  if(!(dt>0))continue;
  if(raw>.25||cut(f)){gapSeconds+=dt;continue}
  covered+=dt;
  const present=new Map((f.players||[]).filter(active).map(p=>[idFor(p),p])),after=new Map((next.players||[]).filter(active).map(p=>[idFor(p),p]));
  const holders=[...present.values()].filter(p=>p.hasBall===true),owner=f.ball?.state==='held'&&f.ball.owner!=null?present.get(String(f.ball.owner)):null;
  const possessor=owner||(f.ball?.state==='held'&&holders.length===1?holders[0]:null);
  const phase=possessor?possessor.team:f.ball?.state==='free'?'free':'unknown';teams[phase]+=dt;
  if(onField(f.ball?.cf)){ballHeat[bin(f.ball.cf)]+=dt;ballSeconds+=dt}
  for(const p of present.values()){
   const a=get(p),k=bin(p.cf);a.seconds+=dt;a.teamSeconds[p.team]+=dt;a.x+=p.cf[0]*dt;a.z+=p.cf[2]*dt;a.heat[k]+=dt;
   if(possessor&&idFor(possessor)===a.id){a.held+=dt;a.heldHeat[k]+=dt}else if(phase!=='unknown')a.withoutHeat[k]+=dt;
   const q=after.get(a.id);if(!q||q.team!==p.team){a.excluded+=dt;continue}
   const distance=Math.hypot(q.cf[0]-p.cf[0],q.cf[2]-p.cf[2]),speed=distance/raw;
   if(!Number.isFinite(speed)||speed>160){a.excluded+=dt;continue}
   a.distance+=speed*dt;a.moveSeconds+=dt;a.maxSpeed=Math.max(a.maxSpeed,speed);
  }
 }
 // Counter deltas are scoped to the selected period; missing fields are not zero.
 const localId=options.localId==null?null:String(options.localId);
 for(const f of frames){
  if(f.t>end)break;
  const rows=[];
  if(localId!==null&&f.localStats&&typeof f.localStats==='object')rows.push([localId,f.localStats]);
  for(const [id,v] of rows){
   const a=actors.get(id);if(!a)continue;
   if(f.t>=start){if(typeof v.Style==='string'&&v.Style)a.styles.add(v.Style.slice(0,100));if(typeof v.Flow==='string'&&v.Flow)a.flows.add(v.Flow.slice(0,100))}
   if(!baselines.has(id))baselines.set(id,Object.create(null));const previous=baselines.get(id);
   for(const k of statKeys){const n=v[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0)continue;
    if(f.t>=start&&previous[k]!=null&&n>=previous[k])a.counters[k]=(a.counters[k]??0)+n-previous[k];
    else if(f.t>=start&&previous[k]!=null&&n<previous[k]){if(a.counters[k]==null)a.counters[k]=0}
    previous[k]=n;
   }
  }
 }
 for(const a of actors.values()){a.average=a.seconds?[a.x/a.seconds,a.z/a.seconds]:null;a.team=a.teamSeconds.Home&&a.teamSeconds.Away?'Mixed':a.teamSeconds.Home?'Home':'Away'}
 return {actors,teams,covered,gapSeconds,ballHeat,ballSeconds,nx,nz,start,end};
}
