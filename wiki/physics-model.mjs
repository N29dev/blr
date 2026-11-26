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
