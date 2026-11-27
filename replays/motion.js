/* Local-only R6 animation reference importer; no asset requests or uploads. */
globalThis.ReplayMotion=(()=>{
 const names=['Torso','Head','Left Arm','Right Arm','Left Leg','Right Leg'];
 const identity=[0,0,0,1,0,0,0,1,0,0,0,1];
 const ID=Object.freeze({idle:'18708846381',run:'72668568236405',shoot:'18668827116',slide:'18668814876',jump:'18908607940',fall:'18908617808',land:'18908620181',header:'18908622474',diveLeft:'18694489186',diveRight:'18694492159',diveForward:'18694494525',gkIdle:'121578069672153',catch:'97121751593499',throw:'131615442938117',stand:'18678636598',request:'134862602137681'});
 let clips=new Map();
 const label=id=>Object.keys(ID).find(k=>ID[k]===id)||'Clip '+id;
 const validCF=a=>Array.isArray(a)&&a.length===12&&a.every(v=>Number.isFinite(v)&&Math.abs(v)<=1000);
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function quaternion(a){
  const m00=a[3],m01=a[4],m02=a[5],m10=a[6],m11=a[7],m12=a[8],m20=a[9],m21=a[10],m22=a[11],trace=m00+m11+m22;let q;
  if(trace>0){const s=2*Math.sqrt(trace+1);q=[(m21-m12)/s,(m02-m20)/s,(m10-m01)/s,s/4];}
  else if(m00>m11&&m00>m22){const s=2*Math.sqrt(Math.max(1e-12,1+m00-m11-m22));q=[s/4,(m01+m10)/s,(m02+m20)/s,(m21-m12)/s];}
  else if(m11>m22){const s=2*Math.sqrt(Math.max(1e-12,1+m11-m00-m22));q=[(m01+m10)/s,s/4,(m12+m21)/s,(m02-m20)/s];}
  else{const s=2*Math.sqrt(Math.max(1e-12,1+m22-m00-m11));q=[(m02+m20)/s,(m12+m21)/s,s/4,(m10-m01)/s];}
  const n=Math.hypot(...q)||1;return q.map(v=>v/n);
 }
 function slerp(a,b,t){let d=a.reduce((n,v,i)=>n+v*b[i],0);if(d<0){b=b.map(v=>-v);d=-d;}d=clamp(d,-1,1);let q;if(d>.9995)q=a.map((v,i)=>v+(b[i]-v)*t);else{const theta=Math.acos(d),s=Math.sin(theta),u=Math.sin((1-t)*theta)/s,v=Math.sin(t*theta)/s;q=a.map((x,i)=>x*u+b[i]*v);}const n=Math.hypot(...q)||1;return q.map(v=>v/n);}
 function matrix(p,q){const [x,y,z,w]=q;return [...p,1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)];}
 function interpolate(a,b,u){return matrix(a.p.map((v,i)=>v+(b.p[i]-v)*u),slerp(a.q,b.q,u));}
 function load(data){
  if(!data||!Array.isArray(data.clips)||data.clips.length>256)throw Error('Expected BLR motion reference JSON (up to 256 clips).');
  const next=new Map();let skipped=0,total=0;
  for(const c of data.clips){
   const id=String(c?.id||'');if(!/^\d{1,16}$/.test(id)||!Array.isArray(c.frames)||c.frames.length>12000||!Number.isFinite(c.duration)||c.duration<=0||c.duration>120){skipped++;continue;}
   total+=c.frames.length;if(total>100000)throw Error('Too many motion frames.');
   const tracks=Object.fromEntries(names.map(n=>[n,[]]));
   for(const f of c.frames){
    if(!Number.isFinite(f?.time)||f.time<0||f.time>c.duration+.1||!Array.isArray(f.poses))continue;
    const stack=[...f.poses];let count=0;while(stack.length&&count++<128){const p=stack.pop();if(!p||typeof p!=='object')continue;
     if(Object.hasOwn(tracks,p.name)&&validCF(p.cframe)&&p.weight!==0)tracks[p.name].push({t:f.time,p:p.cframe.slice(0,3),q:quaternion(p.cframe)});
     if(Array.isArray(p.children))stack.push(...p.children.slice(0,64));
    }
   }
   if(!tracks.Torso.length){skipped++;continue;}
   for(const arr of Object.values(tracks))arr.sort((a,b)=>a.t-b.t);
   next.set(id,{id,duration:c.duration,loop:c.loop===true,tracks});
  }
  if(!next.size)throw Error('No supported R6 character animation clips.');
  clips=next;return {count:clips.size,skipped};
 }
 function sample(id,time,repeat=false){const c=clips.get(String(id));if(!c||!Number.isFinite(time))return null;const t=repeat||c.loop?((time%c.duration)+c.duration)%c.duration:clamp(time,0,c.duration),pose={};
  for(const name of names){const a=c.tracks[name];if(!a.length)continue;let l=0,h=a.length;while(l<h){const m=(l+h)>>1;if(a[m].t<=t)l=m+1;else h=m;}const p=a[Math.max(0,l-1)],n=a[Math.min(l,a.length-1)],u=p===n?0:clamp((t-p.t)/Math.max(1e-9,n.t-p.t),0,1);pose[name]=interpolate(p,n,u);}
  return pose;
 }
 function list(){return [...clips.values()].map(c=>({id:c.id,label:label(c.id),duration:c.duration})).sort((a,b)=>a.label.localeCompare(b.label));}
 function mul(a,b){const out=[0,0,0];for(let i=0;i<3;i++){out[i]=a[i]+a[3+i*3]*b[0]+a[4+i*3]*b[1]+a[5+i*3]*b[2];for(let j=0;j<3;j++)out[3+i*3+j]=a[3+i*3]*b[3+j]+a[4+i*3]*b[6+j]+a[5+i*3]*b[9+j];}return out;}
 function inv(a){const b=[0,0,0,a[3],a[6],a[9],a[4],a[7],a[10],a[5],a[8],a[11]];for(let i=0;i<3;i++)b[i]=-(b[3+i*3]*a[0]+b[4+i*3]*a[1]+b[5+i*3]*a[2]);return b;}
 const cf=(p,r)=>[...p,...r],rootRot=[-1,0,0,0,0,1,0,1,0],rightRot=[0,0,1,0,1,0,-1,0,0],leftRot=[0,0,-1,0,1,0,1,0,0];
 // Standard R6 Motor6D rest offsets, not measured custom rig offsets.
 const joints=[['Torso','root',cf([0,0,0],rootRot),cf([0,0,0],rootRot)],['Head','Torso',cf([0,1,0],rootRot),cf([0,-.5,0],rootRot)],['Right Arm','Torso',cf([1,.5,0],rightRot),cf([-.5,.5,0],rightRot)],['Left Arm','Torso',cf([-1,.5,0],leftRot),cf([.5,.5,0],leftRot)],['Right Leg','Torso',cf([1,-1,0],rightRot),cf([.5,1,0],rightRot)],['Left Leg','Torso',cf([-1,-1,0],leftRot),cf([-.5,1,0],leftRot)]];
 function transforms(pose={}){const world={root:identity};for(const [name,parent,c0,c1] of joints)world[name]=mul(mul(mul(world[parent],c0),pose[name]||identity),inv(c1));return world;}
 function point(a,x,y,z){return [a[0]+a[3]*x+a[4]*y+a[5]*z,a[1]+a[6]*x+a[7]*y+a[8]*z,a[2]+a[9]*x+a[10]*y+a[11]*z];}
 function estimate(actor,previous,dt,ground,time){const a=actor?.cf,b=previous?.cf;if(!a||!Number.isFinite(time))return null;
  const usable=b&&dt>0&&dt<.3,vy=usable?(a[1]-b[1])/dt:0,speed=usable?Math.hypot(a[0]-b[0],a[2]-b[2])/dt:0;
  if(a[1]>ground+4.2){return vy>3?sample(ID.jump,clamp((a[1]-ground-3)/20,0,.25)):sample(ID.fall,time,true);}
  return speed>3&&speed<160?sample(ID.run,time*clamp(speed/22,.55,1.7),true):sample(ID.idle,time,true);
 }
 return {load,sample,list,transforms,point,estimate,ID,hasClips:()=>clips.size>0};
})();
