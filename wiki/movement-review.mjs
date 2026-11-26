// Independent movement reference. Coordinates: right +x, forward +z.
const chain=(stages,total,parameter=null)=>({kind:'chain',stages,total,parameter});
export const MOVEMENT_REVIEW={
 'Side Step Dribble':{description:'Body-relative; reads root position and facing separately at 0, 0.5 and 1.5 s. Each stage fixes its own target. There is a 0.5 s gap between stages 2 and 3.',model:chain([{at:0,d:.5,x:20,z:20,name:'Right-forward'},{at:.5,d:.5,x:-20,z:20,name:'Left-forward'},{at:1.5,d:.5,x:0,z:'D',name:'Forward'}],2.3,'SideStepDribble.Distance')},
 'Match Cut-In':{description:'Body-relative; each delayed callback reads current position and facing. First two targets use quadratic ease-out; final target uses linear interpolation.',model:chain([{at:.05,d:.15,x:-20,z:0,name:'Left'},{at:.3,d:.25,x:20,z:0,name:'Right'},{at:.6,d:.6,x:0,z:'D',linear:true,name:'Forward'}],1.2,'MatchCutIn.Distance')},
 'Bait Dribble':{description:'Opponent selection is an activation condition, not the movement direction. Each stage reads current body facing; first rotates right 45°, second left 45°. Cleanup at 0.7 s interrupts the nominal second tween ending at 0.8 s.',model:chain([{at:.1,d:.3,x:'diag',z:'diag',name:'Right-forward'},{at:.5,d:.3,x:'negdiag',z:'diag',name:'Left-forward'}],.7,'BaitDribble.TravelDistance')},
 'No-Break Dribble':{description:'Continuously camera-relative: the shared executeDash helper recalculates the normalized horizontal camera direction each Heartbeat and turns the root to face it. Speed is 6 stud/s through 0.4 s, then sine-eases from 150 toward 105 over 0.5 s; helper ends at 0.8 s. Raycast collision can zero velocity.',model:{kind:'steer',total:.8}},
 'Instincts Reaction':{description:'One fixed target after activation. Side branches use the opposite of normalized horizontal movement velocity, while forward/back animation branches both use body LookVector. Branch choice uses velocity in body-local space; zero-speed/ties are not modeled.',model:{kind:'instinct',total:.5}},
 'Shark Steal':{description:'Opponent-tracking AlignPosition with MaxVelocity 150 stud/s, responsiveness 100; ends after 1 s or within 3 studs. Actual constraint response and target movement are not determined by the export.'},
 'Scorpion Kick':{description:'Ball-target and camera-dependent initial velocity in the outfield branch; goalkeeper branch uses separate horizontal/vertical velocity calculations. No fixed dash distance.'},
 'Diving Header':{description:'Ball-dependent velocity branch; goalkeeper and outfield behavior differ. No fixed dash path.'},
 'Vision Stoppage':{description:'Direction uses sampled humanoid movement direction; if zero, uses normalized horizontal camera facing. This is a sampled direction, not continuously camera-steered. Vertical jump and movement response are separate.'},
 'Fadeaway':{description:'Opponent-targeted request; actual player displacement is not resolved in the client wrapper.'},
 'Accelerate':{description:'Client requests movement without exposing its path or direction calculation in the ability wrapper.'},
 'Panther Illusion':{description:'Requests Accelerate with charge index; movement path is not resolved in this wrapper.'},
 'Blast':{description:'Sends body-frame transform with a fixed pitch offset; resulting movement is not resolved in this wrapper.'},
 'Disruption':{description:'Opponent-ball and field-dependent request; actual movement is not resolved in the client wrapper.'},
 'Stoppage':{description:'Movement-state and speed boost; no predetermined displacement.'},
 'Speedster':{description:'Speed boost, not a predetermined dash target.'},
 'High-Speed Speedster':{description:'Speed boost and follow-up state, not a predetermined dash target.'}
};
const rad=a=>a*Math.PI/180,rot=(x,z,a)=>[x*Math.cos(rad(a))+z*Math.sin(rad(a)),z*Math.cos(rad(a))-x*Math.sin(rad(a))],clamp=x=>Math.max(0,Math.min(1,x));
function component(x,D){return x==='D'?D:x==='diag'?D/Math.SQRT2:x==='negdiag'?-D/Math.SQRT2:x}
export function chainPath(spec,yaws,D,t=spec.total){
 let x=0,z=0,length=0;const segments=[];
 for(let i=0;i<spec.stages.length;i++){const s=spec.stages[i],v=rot(component(s.x,D),component(s.z,D),yaws[i]||0),u=clamp((Math.min(t,spec.total)-s.at)/s.d),k=s.linear?u:1-(1-u)**2;const start=[x,z];x+=v[0]*k;z+=v[1]*k;length+=Math.hypot(...v)*k;segments.push({start,end:[x,z],u,k});}
 return {x,z,length,segments};
}
export function steerPath(start,end,t=.8){let x=0,z=0,length=0;const points=[[0,0]],n=Math.ceil(t*240);for(let i=0;i<n;i++){const dt=Math.min(1/240,t-i/240),time=i/240+dt/2;if(dt<=0)break;const angle=start+(end-start)*time/.8,speed=time<=.4?6:150+(105-150)*Math.sin(Math.PI/2*clamp((time-.4)/.5)),v=rot(0,speed*dt,angle);x+=v[0];z+=v[1];length+=speed*dt;points.push([x,z]);}return {x,z,length,points};}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
const svg=(tag,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
export function renderMovementReview(name){
 const item=MOVEMENT_REVIEW[name];if(!item)return null;
 const root=el('details');root.className='am-box';root.append(el('summary',item.model?'Combined movement preview':'Movement direction reference'),el('p',item.description));if(!item.model)return root;
 let built=false;root.addEventListener('toggle',()=>{if(!root.open||built)return;built=true;
 const m=item.model,controls=el('div'),inputs=[],labels=[];
 function input(label,min,max,value,step=1){const wrap=el('label'),output=el('span'),i=el('input');wrap.style.display='block';i.type='range';i.min=min;i.max=max;i.step=step;i.value=value;i.style.width='100%';i.setAttribute('aria-label',label);wrap.append(el('span',label+' · '),output,i);controls.append(wrap);inputs.push(i);labels.push([output,i]);return i;}
 const yaw=m.kind==='chain'?m.stages.map((s,i)=>input('Stage '+(i+1)+' body yaw (°)',-180,180,0)):m.kind==='steer'?[input('Initial camera yaw (°)',-180,180,0),input('Final camera yaw (°)',-180,180,0)]:[input('Body yaw (°)',-180,180,0),input('Horizontal movement relative to body (°)',-180,180,90)];
 const distance=m.parameter?input('Scenario distance (studs) · '+m.parameter,0,150,30):null;
 if(distance)controls.append(el('p','Actual balancing value is absent from the supplied exports. 30 studs is an editable illustration only, not a configured or measured value.'));
 if(m.kind==='steer')controls.append(el('p','Illustrative camera yaw changes linearly over the full dash. Actual camera input is arbitrary; collision and physics response are excluded.'));
 const progress=input('Elapsed time (s)',0,m.total,0,.01),play=el('button','▶ Play'),reset=el('button','Reset');play.type=reset.type='button';reset.style.marginLeft='8px';const bar=el('div'),speed=el('select');speed.setAttribute('aria-label','Playback speed');for(const n of [.5,1,2]){const o=el('option',n+'×');o.value=n;speed.append(o);}speed.value=1;bar.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin:8px 0';bar.append(play,reset,speed);controls.insertBefore(bar,controls.firstChild);progress.step='any';root.append(controls);
 const g=svg('svg',{viewBox:'0 0 340 240',role:'img','aria-label':'Top-down movement target path'});g.style.cssText='width:100%;background:#122b28;border:1px solid #476057;border-radius:6px;display:block;margin-top:8px';const stats=el('p');root.append(g,stats);
 if(m.kind==='chain'){const table=el('div');for(const [i,s] of m.stages.entries())table.append(el('p',(i+1)+'. '+s.name+' · '+s.at+'–'+Math.min(m.total,s.at+s.d).toFixed(2)+' s · '+(s.linear?'linear':'quadratic ease-out')));root.append(table);}
 root.append(el('p','Preview assumes ideal target following and no movement between stages. Body yaw is sampled per stage, not automatically changed by the dash. Constraint lag, ordinary movement, collisions and server correction can change the real path. The displayed length and displacement are model values.'));
 const colors=['#8ad7fe','#f5c477','#96e6ad'];let raf=0;
 function model(t){const a=yaw.map(i=>+i.value);if(m.kind==='chain')return chainPath(m,a,distance?+distance.value:0,t);if(m.kind==='steer')return steerPath(a[0],a[1],t);const rel=a[1],side=Math.abs(Math.sin(rad(rel)))>Math.abs(Math.cos(rad(rel))),v=rot(0,25,side?a[0]+rel+180:a[0]),k=1-(1-clamp(t/.5))**2;return {x:v[0]*k,z:v[1]*k,length:25*k,points:[[0,0],[v[0]*k,v[1]*k]]};}
 function draw(){for(const [out,i] of labels)out.textContent=Number(i.value).toFixed(i===progress?2:0);const full=model(m.total),cur=model(+progress.value),pts=full.segments?[[0,0],...full.segments.map(s=>s.end)]:full.points;const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),scale=Math.min(270/Math.max(20,maxX-minX),190/Math.max(20,maxZ-minZ)),X=x=>170+(x-(minX+maxX)/2)*scale,Y=z=>120-(z-(minZ+maxZ)/2)*scale;
 g.replaceChildren();for(let k=-150;k<=150;k+=10){g.append(svg('line',{x1:X(k),y1:0,x2:X(k),y2:240,stroke:'#ffffff0d'}),svg('line',{x1:0,y1:Y(k),x2:340,y2:Y(k),stroke:'#ffffff0d'}));}
 function path(p,color,width,dash){g.append(svg('polyline',{points:p.map(q=>X(q[0])+','+Y(q[1])).join(' '),fill:'none',stroke:color,'stroke-width':width,'stroke-dasharray':dash||'none','stroke-linecap':'round'}));}
 if(full.segments)full.segments.forEach((s,i)=>{path([s.start,s.end],colors[i%3],2,'5 4');const a=cur.segments[i];path([a.start,a.end],colors[i%3],4);const l=svg('text',{x:X(s.end[0])+5,y:Y(s.end[1])-6,fill:colors[i%3],'font-size':12});l.textContent=i+1;g.append(l);});else{path(full.points,'#829a92',2,'5 4');path(cur.points,'#96e6ad',4);}
 g.append(svg('circle',{cx:X(0),cy:Y(0),r:4,fill:'#aabeb5'}),svg('circle',{cx:X(cur.x),cy:Y(cur.z),r:6,fill:'#fff',stroke:'#152b25','stroke-width':2}));stats.textContent='Model path length '+cur.length.toFixed(1)+' studs · net displacement '+Math.hypot(cur.x,cur.z).toFixed(1)+' studs';}
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;play.textContent='▶ Play';}play.addEventListener('click',()=>{if(raf){stop();return;}if(+progress.value>=m.total)progress.value=0;let t=+progress.value,last=0;play.textContent='Ⅱ Pause';function tick(now){if(!controls.isConnected||!controls.closest('details')?.open){stop();return;}if(last)t=Math.min(m.total,t+(now-last)/1000*+speed.value);last=now;progress.value=t;draw();if(t>=m.total)stop();else raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);});reset.addEventListener('click',()=>{stop();progress.value=0;draw();});inputs.forEach(i=>i.addEventListener('input',()=>{stop();draw();}));draw();
 });return root;
}
