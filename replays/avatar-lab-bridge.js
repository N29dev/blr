/* Independent image client for optional static R6 rendering. Each job owns its iframe. */
const ReplayAvatarLab=(()=>{
 const cache=new Map(),queue=new Map(),failed=new Map(),attempts=new Map();
 let active=null,serial=0,wake=null,allowed=new Set(),generation=0;
 const origin=location.origin,validId=id=>/^[1-9][0-9]{0,15}$/.test(id)&&Number.isSafeInteger(Number(id));
 function validViews(d){
  if(!Array.isArray(d.elevations)||d.views!==8)return false;
  const levels=d.elevations;
  if(levels.length!==2&&levels.length!==5)return false;
  const expected=levels.length===5?[0,30,45,60,90].map(x=>x*Math.PI/180):[.16,.70];
  return levels.every((v,i)=>Number.isFinite(v)&&Math.abs(v-expected[i])<1e-6)&&Array.isArray(d.images)&&d.images.length===d.views*levels.length;
 }
 function viewIndex(hit,actor,camera){
  const [x,y,z]=actor.cf,[cx,cy,cz]=camera.pos,dx=cx-x,dz=cz-z,yaw=Number.isFinite(actor.cf[4])?actor.cf[4]:0;
  const horizontal=Math.hypot(dx,dz),elev=camera.topDown?Math.PI/2:Math.max(0,Math.atan2(cy-y,horizontal));
  let azimuth=Math.atan2(dx,dz);
  if(camera.topDown)azimuth=0;
  else if(horizontal<1e-5&&camera.up)azimuth=Math.atan2(-camera.up[0],-camera.up[2]);
  let level=0;
  for(let j=1;j<hit.elevations.length;j++)if(Math.abs(elev-hit.elevations[j])<Math.abs(elev-hit.elevations[level]))level=j;
  const i=((Math.round((azimuth-yaw)*hit.views/(2*Math.PI))%hit.views)+hit.views)%hit.views;
  return level*hit.views+i;
 }

 const enabled=()=>document.getElementById('avatarMode')?.value==='roavatar'&&!document.getElementById('avatarMode')?.disabled;
 function report(){
  const el=document.getElementById('avatarLabStatus');if(!el)return;
  const ids=[...allowed],loaded=ids.filter(id=>cache.has(id)).length,errors=ids.filter(id=>failed.has(id)).length,partial=ids.filter(id=>cache.get(id)?.omitted?.length).length;
  el.textContent=enabled()?'R6 · '+loaded+'/'+ids.length+' resolved outfits'+(active?' · rendering '+active.id:'')+(queue.size?' · '+queue.size+' queued':'')+(partial?' · '+partial+' partial':'')+(errors?' · '+errors+' unavailable (see roster)':''):'';
 }
 function dispose(job){if(!job)return;clearTimeout(job.timer);job.frame?.remove()}
 function schedule(){
  clearTimeout(wake);wake=null;if(!enabled()||active)return;
  let earliest=Infinity;for(const v of queue.values())earliest=Math.min(earliest,v.after);
  if(earliest!==Infinity)wake=setTimeout(pump,Math.max(0,earliest-Date.now()));
 }
 function pump(){
  if(active||!enabled())return;
  const now=Date.now(),entry=[...queue].find(([id,v])=>allowed.has(id)&&v.after<=now);
  if(!entry){report();schedule();return}
  const [id,task]=entry;queue.delete(id);clearTimeout(wake);wake=null;
  const frame=document.createElement('iframe');frame.title='Static R6 rendering service';frame.src='/replays/avatar-lab/index.html?embedded=1&v=15';frame.hidden=true;frame.referrerPolicy='no-referrer';
  const job={id,task,frame,requestId:String(++serial),generation,ready:false,timer:null};active=job;
  attempts.set(id,(attempts.get(id)||0)+1);
  job.timer=setTimeout(()=>{if(active===job)finish(null,'Renderer initialization timed out')},40000);
  document.body.append(frame);report();
 }
 function finish(data,error){
  const job=active;if(!job)return;active=null;dispose(job);
  if(data){cache.delete(job.id);cache.set(job.id,data);failed.delete(job.id);attempts.delete(job.id);if(cache.size>32){const old=[...cache.keys()].find(id=>!allowed.has(id))||cache.keys().next().value;cache.delete(old)}}
  else if(job.generation===generation&&allowed.has(job.id)){
   const count=attempts.get(job.id)||1;
   if(count<3&&enabled()){queue.set(job.id,{...job.task,after:Date.now()+[0,8000,35000][count]});failed.delete(job.id)}
   else failed.set(job.id,String(error||'Assets unavailable').slice(0,180));
  }
  job.task.onChange?.();report();pump();
 }
 window.addEventListener('message',event=>{
  const job=active;if(!job||event.origin!==origin||event.source!==job.frame.contentWindow)return;
  const d=event.data;
  if(d?.type==='blr-r6-ready'){
   if(job.ready)return;job.ready=true;clearTimeout(job.timer);
   job.timer=setTimeout(()=>{if(active===job)finish(null,'Avatar rendering timed out')},240000);
   job.frame.contentWindow.postMessage({type:'blr-r6-render',userId:job.id,requestId:job.requestId},origin);return;
  }
  if(!job.ready||d?.requestId!==job.requestId||d.userId!==job.id)return;
  if(d.type==='blr-r6-error'){finish(null,String(d.error||'Assets unavailable'));return}
  if(d.type!=='blr-r6-result'||!validViews(d)||!Number.isFinite(d.verticalSpan)||d.verticalSpan<5||d.verticalSpan>15||d.images.some(s=>typeof s!=='string'||s.length>500000||!s.startsWith('data:image/png;base64,'))){finish(null,'Invalid sprite response');return}
  const footRings=Array.isArray(d.footRings)&&d.footRings.length===d.images.length&&d.footRings.every(r=>Array.isArray(r)&&r.length===40&&r.every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<4)))?d.footRings:null;
  Promise.all(d.images.map(src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src}))).then(images=>{if(active===job)finish({images,footRings,span:d.verticalSpan,views:d.views,elevations:d.elevations,omitted:Array.isArray(d.omitted)?d.omitted.filter(v=>typeof v==='string').slice(0,30):[]})},()=>{if(active===job)finish(null,'Image decoding failed')});
 });
 function setRoster(ids){
  allowed=new Set(ids.map(String).filter(validId));
  for(const id of queue.keys())if(!allowed.has(id))queue.delete(id);
  if(active&&(!allowed.has(active.id)||!enabled())){const job=active;active=null;dispose(job);attempts.delete(job.id)}
  for(const id of attempts.keys())if(!allowed.has(id))attempts.delete(id);
  report();pump();
 }
 function request(id,onChange){
  id=String(id||'');if(!validId(id)||!enabled())return;
  allowed.add(id);
  if(cache.has(id)||failed.has(id)||active?.id===id||queue.has(id))return;
  if(queue.size>=64)return;
  queue.set(id,{onChange,after:Date.now()});pump();report();
 }
 function get(id,actor,camera,onChange){
  id=String(id||'');if(!validId(id))return null;
  const hit=cache.get(id);if(hit){const i=viewIndex(hit,actor,camera);return {image:hit.images[i],footRing:hit.footRings?.[i]||null,span:hit.span}}
  request(id,onChange);return null;
 }
 function state(id){
  id=String(id||'');if(!validId(id))return 'Resolving Roblox ID';
  const hit=cache.get(id);if(hit)return hit.omitted?.length?'R6 ready (partial)':'R6 ready';
  if(active?.id===id)return 'Rendering R6';
  if(queue.has(id))return (attempts.get(id)||0)?'Retry queued':'R6 queued';
  if(failed.has(id))return 'R6 unavailable: '+failed.get(id);
  return 'R6 pending';
 }
 function retry(onChange){
  generation++;for(const id of allowed){failed.delete(id);attempts.delete(id);if(!cache.has(id)&&active?.id!==id)queue.set(id,{onChange,after:Date.now()})}report();pump();
 }
 return {get,request,setRoster,state,retry};
})();