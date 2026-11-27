// SPDX-License-Identifier: GPL-3.0-only
// Separate experimental renderer. Uses RoAvatar-Renderer's documented public API.
// The existing replay viewer communicates only through a small image message protocol.
const endpoint='https://glutony.scp343hey.workers.dev/api/replay/asset';
const version='https://esm.sh/roavatar-renderer@1.10.4?bundle&deps=three@0.185.1';
// Upstream's documented bundled base rig and compositing assets, pinned to its source revision.
const baseAssets='https://raw.githubusercontent.com/steinann/RoAvatar/5a055d2eef69c8fa232498729ff107372a4a4984/public/assets/';
function bundledAsset(input){try{const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);if(!u.href.startsWith(baseAssets)||u.search||u.hash)return null;const name=u.href.slice(baseAssets.length);return /^(RigR6\.rbxm|RigR15\.rbxm|rbxasset\/[A-Za-z0-9_./-]+\.(mesh|png))$/.test(name)&&!name.includes('..')?u.href:null}catch{return null}}
const validId=v=>typeof v==='string'&&/^[1-9][0-9]{0,15}$/.test(v)&&Number.isSafeInteger(Number(v));
const state={library:null,init:null,active:null,userId:null,queue:Promise.resolve(),cache:new Map(),objectUrls:new Map()};
const $=id=>document.getElementById(id);
const failures=[];const deniedAssets=new Set();let stage='Ready';const say=v=>{stage=v;const el=$('status');if(el)el.textContent=v;};
function note(v){failures.push(String(v).replace(/https:\/\/[a-z0-9-]+\.rbxcdn\.com\/[^\s]+/gi,'[Roblox CDN asset]').slice(0,400));if(failures.length>100)failures.shift();const el=$('diagnostics');if(el)el.textContent=failures.join('\n');}
window.addEventListener('unhandledrejection',e=>note('Promise: '+(e.reason?.message||e.reason)));
const deadline=(p,ms,what)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(what+' timed out')),ms);Promise.resolve(p).then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)})});
function assetUrl(input,headers){
 const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const url=new URL(raw,location.href),format=new Headers(headers||{}).get('Roblox-AssetFormat')||'';
 if(url.protocol!=='https:'||!(url.hostname==='avatar.roblox.com'||url.hostname==='assetdelivery.roblox.com'||/^[a-z0-9-]+\.rbxcdn\.com$/.test(url.hostname)))throw Error('Unsupported asset host');
 return endpoint+'?url='+encodeURIComponent(url.href)+'&format='+encodeURIComponent(format)+(url.hostname==='assetdelivery.roblox.com'&&state.userId?'&userId='+encodeURIComponent(state.userId):'');
}
async function publicFetch(input,init={}){
 if(init.method&&init.method.toUpperCase()!=='GET')return new Response('Read-only renderer',{status:405});
 try{const url=bundledAsset(input)||assetUrl(input,init.headers);const r=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(30000)});if(!r.ok){const detail=(await r.clone().text()).slice(0,280);if(r.status===403&&detail.includes('HTTP 401'))deniedAssets.add(String(input));note('HTTP '+r.status+' · '+String(input).slice(0,150)+' · '+detail);}return r;}
 catch(e){note('Asset transport: '+String(input).slice(0,150)+' · '+e.message);return new Response('Public asset unavailable',{status:502})}
}
async function imageFetch(input){
 const key=bundledAsset(input)||assetUrl(input);
 if(!state.objectUrls.has(key)){
  const response=await fetch(key,{credentials:'omit',signal:AbortSignal.timeout(30000)});
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
  // Static replay avatars never use animation tracks. Do not fetch the default animation set.
  if(Array.isArray(lib.AllAnimations))lib.AllAnimations.splice(0);
  // The initial description comparison also explicitly loads dance/tool/pose
  // tracks, independently of AllAnimations. Disable that routine in this
  // isolated, static-only renderer.
  if(typeof lib.HumanoidDescriptionWrapper?.prototype?._applyAnimations!=='function')throw Error('Static animation hook unavailable in pinned renderer');
  lib.HumanoidDescriptionWrapper.prototype._applyAnimations=async function(){return undefined};
  FLAGS.ONLINE_ASSETS=false;FLAGS.RIG_PATH=baseAssets;FLAGS.ASSETS_PATH=baseAssets+'rbxasset/';FLAGS.FETCH_FUNC=publicFetch;FLAGS.IMAGE_FUNC=imageFetch;
  FLAGS.INCLUDE_REQUEST_CREDENTIALS_OVERRIDE='omit';FLAGS.API_REQUEST_RETRY=false;
  FLAGS.ENABLE_API_CACHE=true;FLAGS.ENABLE_API_MESH_CACHE=true;FLAGS.ENABLE_API_RBX_CACHE=true;FLAGS.USE_WORKERS=false;FLAGS.GEAR_ENABLED=false;FLAGS.AUDIO_ENABLED=false;FLAGS.BEAMS_ENABLED=false;
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
 deniedAssets.clear();
 if(!validId(id))throw Error('Invalid Roblox UserId');
 const hit=state.cache.get(id);if(hit&&Date.now()-hit.cachedAt<3600000){state.cache.delete(id);state.cache.set(id,hit);return hit}state.cache.delete(id);
 const {API,Authentication,OutfitModel,OutfitRenderer,RBXRenderer}=await initialize();
 if(state.active){state.active.destroy();state.active=null}
 state.userId=id;
 say('Loading outfit metadata for '+id+'…');const model=await deadline(API.Avatar.GetUserAvatarModel(Number(id)),20000,'Outfit lookup');
 if(!(model instanceof OutfitModel))throw Error('Public outfit unavailable (HTTP '+(model?.status||'unknown')+')');
 model.outfit.playerAvatarType='R6';
 const omitted=[];
 // Match the R6 description's accessory and classic clothing GetRBX calls.
 // Test the catalog models first, so a missing/removed catalog item does not
 // reject the whole HumanoidDescription. Body parts use different representation
 // headers and are left to the renderer.
 const optionalTypes=new Set([2,8,11,12,18,41,42,43,44,45,46,47]);
 const optional=model.outfit.assets.filter(a=>optionalTypes.has(Number(a.assetType?.id)));
 say('Checking '+optional.length+' optional outfit items…');
 for(let i=0;i<optional.length;i+=4){
  await Promise.all(optional.slice(i,i+4).map(async asset=>{
   const name=String(asset.name||asset.id).slice(0,100);
   try{
    const data=await deadline(API.Asset.GetRBX('rbxassetid://'+asset.id,undefined),32000,'Catalog item lookup');
    if(data&&typeof data.generateTree==='function')return;
    // The exact same asset lookup is cached by RoAvatar on success.
    // Failed items may be unavailable, moderated or temporarily inaccessible.
    throw Error('Catalog model unavailable'+(data?.status?' (HTTP '+data.status+')':''));
   }catch(e){model.outfit.removeAsset(asset.id);omitted.push(name);note('Omitted unavailable catalog item: '+name+' · '+e.message)}
  }));
 }
 say('Compiling R6 rig, clothing and accessories…');const outfit=new OutfitRenderer(new Authentication(),model.outfit);state.active=outfit;
 outfit.doCameraUpdateOnLoad=false;outfit.doCameraUpdate=false;outfit.deltaTimeMultiplier=0;
 // OutfitRenderer.onRenderSuccess additionally waits for a background, even
 // when no background was requested. For a transparent sprite, wait for the
 // rig's own description and render descendants instead.
 let connections=[];
 try{
  await deadline(new Promise((resolve,reject)=>{
   let outfitReady=false,settled=false;const failed=new Set();
   const scene=RBXRenderer.firstScene;
   const check=()=>{
    if(settled||!outfitReady||!outfit.currentRig)return;
    const descendants=new Set(outfit.currentRig.GetDescendants());
    for(const instance of failed){
     if(!descendants.has(instance)){failed.delete(instance);continue}
     let accessory=instance;
     while(accessory&&accessory!==outfit.currentRig&&accessory.className!=='Accessory')accessory=accessory.parent;
     if(!accessory||accessory===outfit.currentRig){settled=true;reject(Error('Essential mesh or texture failed: '+(instance?.Prop?.('Name')||'unknown instance')));return}
     const name=String(accessory.Prop?.('Name')||'Accessory').slice(0,100);
     omitted.push(name);note('Omitted unavailable accessory: '+name);
     for(const child of accessory.GetDescendants())failed.delete(child);
     failed.delete(accessory);accessory.Destroy();
    }
    if(scene.areInstancesCompiled(outfit.currentRig.GetDescendants())){settled=true;resolve()}
   };
   connections=[
    outfit.onSuccess.Connect(()=>{outfitReady=true;queueMicrotask(check)}),
    outfit.onError.Connect(kind=>{settled=true;reject(Error('R6 rig or outfit failed: '+kind))}),
    scene.compiledRenderDesc.Connect(()=>queueMicrotask(check)),
    scene.failedRenderDesc.Connect(instance=>{failed.add(instance);queueMicrotask(check)})
   ];
  }),90000,'Rig and mesh compilation');
 }catch(e){if(deniedAssets.size)throw Error(deniedAssets.size+' dependent asset request(s) were denied; see diagnostics for the IDs.');throw e;}finally{connections.forEach(c=>c.Disconnect())}
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
 const result={userId:id,cachedAt:Date.now(),images,omitted,views:8,elevations:[0.16,0.70],verticalSpan:2*distance*Math.tan(Math.PI/12)};
 state.cache.set(id,result);if(state.cache.size>24)state.cache.delete(state.cache.keys().next().value);
 return result;
}
function enqueue(id){const job=state.queue.then(()=>renderAccount(id));state.queue=job.catch(()=>{});return job}
function show(result){
 $('preview').src=result.images[4];$('views').replaceChildren();
 result.images.forEach((image,i)=>{const b=document.createElement('button');b.textContent=(i<8?'Low ':'High ')+(i%8+1);b.onclick=()=>{$('preview').src=image};$('views').append(b)});
 $('status').textContent='Rendered static R6 · '+result.userId+' · '+result.images.length+' cached views.'+(result.omitted?.length?' Partial outfit: '+result.omitted.join(', ')+' unavailable.':'');
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
