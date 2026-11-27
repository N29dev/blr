// SPDX-License-Identifier: GPL-3.0-only
// Separate experimental renderer. Uses RoAvatar-Renderer's documented public API.
// The existing replay viewer communicates only through a small image message protocol.
const endpoint='https://glutony.scp343hey.workers.dev/api/replay/asset';
const version='https://esm.sh/roavatar-renderer@1.10.4?bundle&deps=three@0.185.1';
const validId=v=>typeof v==='string'&&/^[1-9][0-9]{0,15}$/.test(v)&&Number.isSafeInteger(Number(v));
const state={library:null,init:null,active:null,queue:Promise.resolve(),cache:new Map(),objectUrls:new Map()};
const $=id=>document.getElementById(id);
const failures=[];let stage='Ready';const say=v=>{stage=v;const el=$('status');if(el)el.textContent=v;};
function note(v){failures.push(String(v).slice(0,260));if(failures.length>15)failures.shift();const el=$('diagnostics');if(el)el.textContent=failures.join('\n');}
window.addEventListener('unhandledrejection',e=>note('Promise: '+(e.reason?.message||e.reason)));
const deadline=(p,ms,what)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(what+' timed out')),ms);Promise.resolve(p).then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)})});
function assetUrl(input,headers){
 const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const url=new URL(raw,location.href),format=new Headers(headers||{}).get('Roblox-AssetFormat')||'';
 if(url.protocol!=='https:'||!(url.hostname==='avatar.roblox.com'||url.hostname==='assetdelivery.roblox.com'||/^[a-z0-9-]+\.rbxcdn\.com$/.test(url.hostname)))throw Error('Unsupported asset host');
 return endpoint+'?url='+encodeURIComponent(url.href)+'&format='+encodeURIComponent(format);
}
async function publicFetch(input,init={}){
 if(init.method&&init.method.toUpperCase()!=='GET')return new Response('Read-only renderer',{status:405});
 try{const url=assetUrl(input,init.headers);const r=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!r.ok)note('HTTP '+r.status+' · '+String(input).slice(0,150)+' · '+(await r.clone().text()).slice(0,100));return r;}
 catch(e){note('Asset transport: '+String(input).slice(0,150)+' · '+e.message);return new Response('Public asset unavailable',{status:502})}
}
async function imageFetch(input){
 const key=assetUrl(input);
 if(!state.objectUrls.has(key)){
  const response=await fetch(key,{credentials:'omit',signal:AbortSignal.timeout(15000)});
  if(!response.ok){note('Texture HTTP '+response.status+' · '+String(input).slice(0,150));throw Error('Texture unavailable: '+response.status);}
  const url=URL.createObjectURL(await response.blob());state.objectUrls.set(key,url);
  if(state.objectUrls.size>256){const oldest=state.objectUrls.keys().next().value;URL.revokeObjectURL(state.objectUrls.get(oldest));state.objectUrls.delete(oldest)}
 }
 return state.objectUrls.get(key);
}
async function initialize(){
 if(!state.init)state.init=(async()=>{
  say('Loading renderer dependency…');const lib=await deadline(import(version),30000,'Renderer download');
  const {FLAGS,RBXRenderer}=lib;
  FLAGS.ONLINE_ASSETS=true;FLAGS.FETCH_FUNC=publicFetch;FLAGS.IMAGE_FUNC=imageFetch;
  FLAGS.INCLUDE_REQUEST_CREDENTIALS_OVERRIDE='omit';FLAGS.API_REQUEST_RETRY=false;
  FLAGS.USE_WORKERS=false;FLAGS.GEAR_ENABLED=false;FLAGS.AUDIO_ENABLED=false;FLAGS.BEAMS_ENABLED=false;
  FLAGS.HIDE_LAYERED_CLOTHING=true;FLAGS.USE_POST_PROCESSING=false;FLAGS.ANIMATE_SKELETON=false;
  FLAGS.PARTICLES_START_FULL=0;
  say('Initializing WebGL and R6 assets…');if(!await deadline(RBXRenderer.fullSetup(true,false,false),30000,'WebGL setup'))throw Error('WebGL2 unavailable');
  RBXRenderer.getRenderer().setPixelRatio(1);RBXRenderer.setRendererSize(256,256);RBXRenderer.setBackgroundTransparent(true);
  if(RBXRenderer.firstScene.shadowPlane)RBXRenderer.firstScene.shadowPlane.visible=false;
  RBXRenderer.firstScene.wellLitDirectionalLightIntensity*=2;
  state.library=lib;return lib;
 })().catch(e=>{state.init=null;throw e});
 return state.init;
}
async function renderAccount(id){
 if(!validId(id))throw Error('Invalid Roblox UserId');
 if(state.cache.has(id))return state.cache.get(id);
 const {API,Authentication,OutfitModel,OutfitRenderer,RBXRenderer}=await initialize();
 if(state.active){state.active.destroy();state.active=null}
 say('Loading outfit metadata for '+id+'…');const model=await deadline(API.Avatar.GetUserAvatarModel(Number(id)),20000,'Outfit lookup');
 if(!(model instanceof OutfitModel))throw Error('Public outfit unavailable (HTTP '+(model?.status||'unknown')+')');
 model.outfit.playerAvatarType='R6';
 say('Compiling R6 rig, clothing and accessories…');const outfit=new OutfitRenderer(new Authentication(),model.outfit);state.active=outfit;
 outfit.doCameraUpdateOnLoad=false;outfit.doCameraUpdate=false;outfit.deltaTimeMultiplier=0;
 let connections=[];
 try{
  await deadline(new Promise((resolve,reject)=>{
   connections=[outfit.onRenderSuccess.Connect(resolve),outfit.onError.Connect(()=>reject(Error('R6 rig or outfit could not load'))),outfit.onRenderError.Connect(()=>reject(Error('A mesh or texture could not compile')))];
  }),45000,'Asset compilation');
 }finally{connections.forEach(c=>c.Disconnect())}
 say('Rendering cached camera views…');outfit.stopAnimating();
 const scene=RBXRenderer.firstScene,root=outfit.currentRig?.FindFirstChild('HumanoidRootPart'),p=root?.Prop('Position');
 const cx=Number.isFinite(p?.X)?p.X:0,cy=Number.isFinite(p?.Y)?p.Y:3,cz=Number.isFinite(p?.Z)?p.Z:0;
 const camera=scene.camera;camera.fov=30;camera.near=.1;camera.far=150;camera.updateProjectionMatrix();
 const images=[];const distance=17;
 for(const elev of [0.16,0.70])for(let i=0;i<8;i++){
  const angle=i*Math.PI/4;
  camera.position.set(cx+Math.sin(angle)*Math.cos(elev)*distance,cy+Math.sin(elev)*distance,cz+Math.cos(angle)*Math.cos(elev)*distance);
  camera.lookAt(cx,cy,cz);camera.updateMatrixWorld(true);
  RBXRenderer.renderScene(scene);
  images.push(RBXRenderer.getRenderer().domElement.toDataURL('image/png'));
 }
 const result={userId:id,images,views:8,elevations:[0.16,0.70],verticalSpan:2*distance*Math.tan(Math.PI/12)};
 state.cache.set(id,result);if(state.cache.size>24)state.cache.delete(state.cache.keys().next().value);
 return result;
}
function enqueue(id){const job=state.queue.then(()=>renderAccount(id));state.queue=job.catch(()=>{});return job}
function show(result){
 $('preview').src=result.images[4];$('views').replaceChildren();
 result.images.forEach((image,i)=>{const b=document.createElement('button');b.textContent=(i<8?'Low ':'High ')+(i%8+1);b.onclick=()=>{$('preview').src=image};$('views').append(b)});
 $('status').textContent='Rendered static R6 · '+result.userId+' · '+result.images.length+' cached views.';
}
$('load').onclick=async()=>{const id=$('uid').value.trim();$('load').disabled=true;failures.length=0;if($('diagnostics'))$('diagnostics').textContent='';say('Loading public outfit, rig, meshes and textures…');try{show(await enqueue(id))}catch(e){const previous=stage;say(previous+' — '+e.message);note(e.stack||e.message)}finally{$('load').disabled=false}};
window.addEventListener('message',async event=>{
 if(event.origin!==location.origin||event.source!==window.parent||window.parent===window)return;
 const data=event.data;if(data?.type!=='blr-r6-render'||!validId(data.userId)||typeof data.requestId!=='string')return;
 try{const result=await enqueue(data.userId);event.source.postMessage({type:'blr-r6-result',requestId:data.requestId,...result},event.origin)}
 catch(e){event.source.postMessage({type:'blr-r6-error',requestId:data.requestId,userId:data.userId,error:String(e.message).slice(0,200)},event.origin)}
});
const queryId=new URLSearchParams(location.search).get('userId');if(validId(queryId)&&window.parent===window){$('uid').value=queryId;$('load').click();}
if(window.parent!==window)window.parent.postMessage({type:'blr-r6-ready'},location.origin);
window.addEventListener('pagehide',()=>{state.active?.destroy();for(const u of state.objectUrls.values())URL.revokeObjectURL(u)});
