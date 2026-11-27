/* Independent image client for the optional static R6 lab. No library code is linked here. */
const ReplayAvatarLab=(()=>{
 const cache=new Map(),queue=new Map(),failed=new Map();let frame=null,ready=false,active=null,serial=0,bootTimer=null;
 const origin=location.origin;
 const status=message=>{const el=document.getElementById('avatarLabStatus');if(el)el.textContent=message};
 function boot(){
  if(frame)return;
  frame=document.createElement('iframe');frame.title='Static R6 rendering service';frame.src='/replays/avatar-lab/index.html?embedded=1';frame.hidden=true;frame.referrerPolicy='no-referrer';document.body.append(frame);
  bootTimer=setTimeout(()=>{if(!ready){status('R6 renderer did not initialize · using body-color fallback');frame?.remove();frame=null;for(const id of queue.keys())failed.set(id,Date.now()+60000);queue.clear()}},20000);
 }
 function pump(){
  if(!ready||active||!queue.size)return;
  if(document.getElementById('avatarMode')?.value!=='roavatar'){queue.clear();return}
  const [id,onChange]=queue.entries().next().value;queue.delete(id);
  const requestId=String(++serial);active={id,onChange,requestId,timer:setTimeout(()=>finish(null,'Renderer timed out'),120000)};
  status('Loading R6 outfit '+id+' · '+queue.size+' queued');
  frame.contentWindow.postMessage({type:'blr-r6-render',userId:id,requestId},origin);
 }
 function finish(data,error){
  if(!active)return;const {id,onChange,timer}=active;clearTimeout(timer);active=null;
  if(data){cache.set(id,data);if(cache.size>24)cache.delete(cache.keys().next().value);status('R6 · '+cache.size+' outfits cached'+(data.omitted?.length?' · partial outfit (unavailable accessories omitted)':'')+(queue.size?' · '+queue.size+' queued':''))}
  else{failed.set(id,Date.now()+300000);status('R6 fallback · '+error)}
  onChange?.();pump();
 }
 window.addEventListener('message',event=>{
  if(event.origin!==origin||!frame||event.source!==frame.contentWindow)return;
  const d=event.data;if(d?.type==='blr-r6-ready'){ready=true;clearTimeout(bootTimer);pump();return}
  if(!active||d?.requestId!==active.requestId||d.userId!==active.id)return;
  if(d.type==='blr-r6-error'){finish(null,String(d.error||'Assets unavailable').slice(0,140));return}
  if(d.type!=='blr-r6-result'||!Array.isArray(d.images)||d.images.length!==16||!Number.isFinite(d.verticalSpan)||d.verticalSpan<5||d.verticalSpan>15||d.images.some(s=>typeof s!=='string'||s.length>400000||!s.startsWith('data:image/png;base64,'))){finish(null,'Invalid sprite response');return}
  const requestId=active.requestId;
  Promise.all(d.images.map(src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src}))).then(images=>{if(active?.requestId===requestId)finish({images,span:d.verticalSpan,omitted:Array.isArray(d.omitted)?d.omitted.filter(v=>typeof v==='string').slice(0,30):[]})},()=>{if(active?.requestId===requestId)finish(null,'Image decoding failed')});
 });
 function get(id,actor,camera,onChange){
  id=String(id||'');if(!/^[1-9][0-9]{0,15}$/.test(id)||!Number.isSafeInteger(Number(id)))return null;
  const hit=cache.get(id);if(hit){
   const [x,y,z]=actor.cf,[cx,cy,cz]=camera.pos,dx=cx-x,dz=cz-z,yaw=Number.isFinite(actor.cf[4])?actor.cf[4]:0,c=Math.cos(yaw),s=Math.sin(yaw);
   const angle=Math.atan2(dx*c-dz*s,dx*s+dz*c);const i=(Math.round(angle/(Math.PI/4))+8)%8;
   const high=Math.atan2(cy-y,Math.hypot(dx,dz))>.43?8:0;
   return {image:hit.images[high+i],span:hit.span};
  }
  if((failed.get(id)||0)>Date.now()||active?.id===id||queue.has(id)||queue.size>=24)return null;
  queue.set(id,onChange);boot();pump();return null;
 }
 return {get};
})();