/* Optional offline replay avatars. Only explicit public account identifiers leave the browser. */
const ReplayAvatars=(()=>{
 const endpoint='https://glutony.scp343hey.workers.dev/api/replay/avatar';
 const results=new Map(),pending=new Map(),resolved=new Map(),images=new Map();
 const validId=v=>/^[1-9][0-9]{0,15}$/.test(String(v??''));
 const recordedId=info=>[info?.userId,info?.UserId,info?.robloxUserId].find(validId);
 const keyFor=info=>{const id=recordedId(info);if(id)return 'id:'+id;const name=info?.username;if(typeof name==='string'&&/^[A-Za-z0-9_]{3,20}$/.test(name))return 'name:'+name.toLowerCase();return null};
 let active=0;const queue=[];
 function pump(){while(active<3&&queue.length){active++;queue.shift()().finally(()=>{active--;pump()})}}
 function get(info,onChange){
  const original=keyFor(info);if(!original)return null;const key=resolved.get(original)||original;
  const cached=results.get(key);if(cached&&Date.now()-cached.time<cached.ttl)return cached.data;
  if(!pending.has(key)){
   pending.set(key,true);queue.push(async()=>{
    try{
     const [kind,value]=key.split(':');const response=await fetch(endpoint+'?'+(kind==='id'?'id=':'name=')+encodeURIComponent(value),{credentials:'omit',signal:AbortSignal.timeout(15000)});
     if(!response.ok)throw Error('lookup failed');
     const data=await response.json();if(!validId(data.userId)||(kind==='id'&&String(data.userId)!==value))throw Error('wrong identity');
     const idKey='id:'+data.userId;resolved.set(original,idKey);results.set(idKey,{data,time:Date.now(),ttl:3600000});
    }catch{results.set(key,{data:null,time:Date.now(),ttl:60000})}
    finally{pending.delete(key);onChange?.()}
   });pump();
  }
  return null;
 }
 function imageFor(data,onChange){
  const url=data?.image;if(typeof url!=='string'||!/^https:\/\/[a-z0-9-]+\.rbxcdn\.com\//i.test(url))return null;
  if(!images.has(url)){const im=new Image();im.referrerPolicy='no-referrer';im.onload=onChange;im.src=url;images.set(url,im)}
  const im=images.get(url);return im.complete&&im.naturalWidth?im:null;
 }
 const parts=[['head',0,2,0,1.3,1.25,1.3],['torso',0,.5,0,2,2,1],['leftArm',-1.5,.5,0,1,2,1],['rightArm',1.5,.5,0,1,2,1],['leftLeg',-.5,-1.5,0,1,2,1],['rightLeg',.5,-1.5,0,1,2,1]];
 const faces=[[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]];
 const shade=(hex,f)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join('');
 function drawRig({actor,colors,team,poly,view,pose=null}){
  const [x,y,z]=actor.cf,angle=Number.isFinite(actor.cf[4])?actor.cf[4]:0,c=Math.cos(angle),s=Math.sin(angle);
  const point=(a,b,d)=>[x+a*c+d*s,y+b,z-a*s+d*c],surfaces=[];const animated=pose&&globalThis.ReplayMotion?ReplayMotion.transforms(pose):null;const nameMap={head:'Head',torso:'Torso',leftArm:'Left Arm',rightArm:'Right Arm',leftLeg:'Left Leg',rightLeg:'Right Leg'};
  for(const [part,px,py,pz,w,h,d] of parts){
   const color=/^#[0-9a-f]{6}$/i.test(colors?.[part]||'')?colors[part]:(part==='torso'?team:'#aab4c2');
   const vs=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,e])=>animated?point(...ReplayMotion.point(animated[nameMap[part]],a*w/2,b*h/2,e*d/2)):point(px+a*w/2,py+b*h/2,pz+e*d/2));
   for(let i=0;i<faces.length;i++){const ps=faces[i].map(j=>vs[j]);surfaces.push({ps,depth:ps.reduce((v,p)=>v+view(p)[2],0)/4,color:shade(color,[.88,.75,.65,1,.79,.92][i])})}
  }
  surfaces.sort((a,b)=>b.depth-a.depth);for(const f of surfaces)poly(f.ps,f.color,'#111820',.45);
 }
 return {get,imageFor,drawRig,recordedId};
})();
