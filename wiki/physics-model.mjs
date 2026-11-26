// Independent numerical reference model; source-derived coefficients and observed snapshot.
// Not an authoritative server simulation. Units are studs and seconds.
export const PHYSICS=Object.freeze({gravity:142,ballMass:2.1014468669891357,ballRadius:.775,landingY:9.5,friction:1,elasticity:.5,dt:1/60});
export function shotVelocity(power,tilt,angle,mode='minimum',multiplier=1){
 const a=angle*Math.PI/180,p=power*multiplier,x=p*Math.cos(a),y=p*(mode==='additive'?Math.sin(a)+tilt:mode==='fixed'?tilt:Math.max(Math.sin(a),tilt));
 return {vx:x,vy:y,speed:Math.hypot(x,y),angle:Math.atan2(y,x)*180/Math.PI};
}
export function dashTarget(distance,duration,t){const u=Math.max(0,Math.min(1,t/duration));return distance*(1-(1-u)**2);}
export function trajectory(vx,vy,{gravity=PHYSICS.gravity,launchY=12,landingY=PHYSICS.landingY,drag=true}={}){
 const dt=PHYSICS.dt,points=[{t:0,x:0,y:launchY}],limit=1200;
 let x=0,y=launchY,t=0,k=.999,active=drag,height=y,landed=false;
 for(let i=0;i<limit;i++){
  if(active&&Math.hypot(vx,vy)<=10)active=false;
  if(active&&y<=18){k-=1/3000;vx*=k;}
  if(active&&y>8&&y<27)vy+=1.3666666746139526;
  const nx=x+vx*dt,ny=y+vy*dt-.5*gravity*dt*dt;
  if(ny<=landingY&&vy-gravity*dt<0){
   const q=Math.max(0,Math.min(1,(y-landingY)/(y-ny||1)));t+=dt*q;x+=(nx-x)*q;y=landingY;points.push({t,x,y});landed=true;break;
  }
  x=nx;y=ny;vy-=gravity*dt;t+=dt;height=Math.max(height,y);points.push({t,x,y});
 }
 return {points,t,range:x,height,landed,distance:Math.hypot(x,y-launchY)};
}
export function interpolateFlight(points,t){
 let lo=0,hi=points.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(points[m].t<=t)lo=m;else hi=m;}
 const a=points[lo],b=points[hi],u=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t||1)));return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
}

// Illustrative contact approximation, not a recreation of Roblox's contact solver.
// First contact is retained separately. Snapshot ball elasticity is 0.5;
// effective ball/pitch restitution is unknown. Ground damping is a scenario assumption.
export const POST_LANDING_SECONDS=2;
export const CONTACT_MODEL=Object.freeze({restitution:.5,rollingDamping:1.2,settleVertical:2});
export function advanceBall(pos,velocity,dt,{ground=PHYSICS.landingY,gravity=PHYSICS.gravity,contact=CONTACT_MODEL}={}){
 let [x,y,z]=pos,[vx,vy,vz]=velocity,impact=null;const eps=1e-7;
 const roll=h=>{const k=Math.exp(-contact.rollingDamping*h),factor=contact.rollingDamping>0?(1-k)/contact.rollingDamping:h;x+=vx*factor;z+=vz*factor;vx*=k;vz*=k;y=ground;vy=0;};
 if(y<=ground+eps&&vy<=contact.settleVertical){impact={at:0,position:[x,ground,z]};roll(dt);return {position:[x,y,z],velocity:[vx,vy,vz],impact,rolling:true};}
 const nextY=y+vy*dt-.5*gravity*dt*dt;
 if(nextY<=ground&&vy-gravity*dt<0){
  const h=Math.max(0,Math.min(dt,(vy+Math.sqrt(Math.max(0,vy*vy+2*gravity*(y-ground))))/gravity));
  x+=vx*h;z+=vz*h;y=ground;vy-=gravity*h;impact={at:h,position:[x,y,z]};vy=-vy*contact.restitution;const left=dt-h;
  if(vy<=contact.settleVertical||y+vy*left-.5*gravity*left*left<ground){roll(left);return {position:[x,y,z],velocity:[vx,vy,vz],impact,rolling:true};}
  x+=vx*left;z+=vz*left;y+=vy*left-.5*gravity*left*left;vy-=gravity*left;
 }else{x+=vx*dt;z+=vz*dt;y=nextY;vy-=gravity*dt;}
 return {position:[x,y,z],velocity:[vx,vy,vz],impact,rolling:false};
}
export function flight3D(initial,{launchY=12,drag=true,postLanding=POST_LANDING_SECONDS,correct=null}={}){
 const dt=PHYSICS.dt;let position=[0,launchY,0],velocity=initial.slice(),t=0,k=.999,dragging=drag,landing=null,rolling=false;const points=[];
 const sample=()=>({x:position[0],y:position[1],z:position[2],t,speed:Math.hypot(...velocity),rolling});
 points.push(sample());
 for(let i=0;i<1500;i++){
  const step=landing?Math.min(dt,Math.max(0,landing.t+postLanding-t)):dt;if(step<=1e-9)break;
  if(correct)correct(velocity,t,step);
  if(dragging&&Math.hypot(...velocity)<=10)dragging=false;
  if(dragging&&position[1]<=18){k-=step/dt/3000;velocity[0]*=k;velocity[2]*=k;}
  if(dragging&&position[1]>8&&position[1]<27)velocity[1]+=1.3666666746139526*step/dt;
  const a=advanceBall(position,velocity,step);
  if(!landing&&a.impact){const [x,y,z]=a.impact.position;landing={x,y,z,t:t+a.impact.at};points.push({...landing,speed:Math.hypot(...velocity),rolling:false});if(postLanding<=0){t=landing.t;break;}}
  position=a.position;velocity=a.velocity;rolling=a.rolling;t+=step;points.push(sample());
 }
 return {points,t,landed:!!landing,landing,postLanding:landing?Math.max(0,t-landing.t):0,end:landing?'Post-landing preview complete':'Simulation limit',range:landing?Math.hypot(landing.x,landing.z):Math.hypot(position[0],position[2]),height:Math.max(...points.map(p=>p.y))};
}
