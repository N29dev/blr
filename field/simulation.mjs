import './geometry.js';
import {sourceMovement,movementAt,sourceCurve,curveFlight} from '../wiki/source-motion-review.mjs?v=19';
import {sourcePass,guidedFlight,sourceShot,straightFlight,withReceiver} from '../wiki/flight-3d.mjs?v=13';
import {previewControls,bindPreviewPlayback} from '../wiki/preview-playback.mjs?v=1';
const G=globalThis.BLRFieldGeometry,L=G.lengthX,D=G.widthZ,FLOOR=G.illustrativeGroundY;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,u)=>a+(b-a)*u;
const el=(tag,s)=>{const n=document.createElement(tag);if(s!=null)n.textContent=s;return n;};
const nagiIds={'Dash':'nagi-dash','Zero Reset Turn':34188,'Direct Heel Lift':33975,'Trap Shot':33533,'Breakdance Shot':33896,'I Am Nagi':33723};
const nagiShots={'Trap Shot':{p:130,k:.35,mode:'additive'},'Breakdance Shot':{p:170,k:.1,mode:'minimum'},'Direct Heel Lift':{p:160,k:.15,mode:'minimum'},'I Am Nagi':{p:161.5,k:.2,mode:'additive'}};
export function fieldComponents(id,name,manual=false,implementation=null){
 const sid=id??(manual?nagiIds[name]:null),out=[],m=sourceMovement(sid),c=sourceCurve(sid),p=sourcePass(sid),s=sourceShot(sid);
 if(m)out.push({kind:'movement',spec:m,label:'Movement target',partial:m.params.some(p=>p.value==null)||!!(m.scenarioTime||m.steer||m.decay)});
 if(c)out.push({kind:'curve',spec:c,label:c.kind==='pass'?'Curved pass response':'Curved release response',partial:c.p==null&&!c.powers||c.tilt==null||!!c.tiltUnknown||c.side==='response'});
 if(p)out.push({kind:'pass',spec:p,label:'Guided pass response',partial:true});
 if(!c)for(const [i,q] of (s||[]).entries())out.push({kind:'shot',spec:q,label:'Ball release'+(s.length>1?' · response '+(i+1):''),partial:q.p==null||q.k==null||!!q.note});
 if(!c&&!s&&implementation?.shot&&Number.isFinite(implementation.shot.p)&&Number.isFinite(implementation.shot.k))out.push({kind:'shot',spec:implementation.shot,label:'Conditional ball release',partial:true});
 if(manual&&!out.some(x=>x.kind==='shot')&&nagiShots[name])out.push({kind:'shot',spec:nagiShots[name],label:'Ball release',partial:false});
 if(sid===4753&&m&&s?.[0]?.p!=null&&s[0].k!=null)out.unshift({kind:'combined',spec:{motion:m,shot:s[0],description:m.description+' '+s[0].note},label:'Movement + ball lift (same response)',partial:true});
 return out;
}
function sample(points,t){if(!points.length)return null;let a=0,b=points.length-1;while(a+1<b){const m=(a+b)>>1;if(points[m].t<=t)a=m;else b=m;}const p=points[a],q=points[b],u=clamp((t-p.t)/(q.t-p.t||1),0,1);return {x:mix(p.x,q.x,u),y:mix(p.y,q.y,u),z:mix(p.z,q.z,u),receiver:p.receiver&&q.receiver?p.receiver.map((v,i)=>mix(v,q.receiver[i],u)):p.receiver};}
function world(p,origin){return [origin[0]+p.z,origin[1]+p.x,Math.max(0,p.y-FLOOR)];}
function makeView(){
 const canvas=el('canvas');canvas.style.cssText='display:block;width:100%;aspect-ratio:16/9;border:1px solid #395a4b;border-radius:8px;background:#183e30';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','BLR field simulation in studs');
 const ctx=canvas.getContext('2d');const W=800,H=450;
 function draw(scene,zoom='follow'){
  if(!ctx)return;const dpr=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==W*dpr||canvas.height!==H*dpr){canvas.width=W*dpr;canvas.height=H*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);
  const a=scene.people[0].pos,pts=scene.people.map(x=>x.pos).concat(scene.ball?[scene.ball]:[]);
  const target=zoom==='field'?[L/2,D/2]:[a[0]*.65+(scene.ball?.[0]??a[0])*.35,a[1]*.65+(scene.ball?.[1]??a[1])*.35];
  const span=Math.max(70,...pts.map(p=>Math.max(Math.abs(p[0]-target[0])*2,Math.abs(p[1]-target[1])*2)));
  const scale=zoom==='field'?Math.min(720/L,340/(D*.70)):clamp(570/(span+36),1.1,6.5);
  const pitch=zoom==='top'?1:.68,angle=zoom==='top'?0:-.08,C=Math.cos(angle),S=Math.sin(angle);
  function pr(p){const x=p[0]-target[0],z=p[1]-target[1];return [W/2+(x*C-z*S)*scale,H*.54+(x*S+z*C)*scale*pitch-(p[2]||0)*scale*(zoom==='top'?0:.85)];}
  function path(points,{fill=null,stroke=null,width=1,dash=[],close=false}={}){ctx.beginPath();points.forEach((p,i)=>{const [x,y]=pr(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});if(close)ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}}
  const rect=(x,z,w,d,fill,stroke)=>path([[x,z,0],[x+w,z,0],[x+w,z+d,0],[x,z+d,0]],{fill,stroke,close:true,width:1.4});
  const fx=x=>x/1468*L,fz=z=>z/1100*D,white='#d9eee0';
  ctx.fillStyle='#175d33';ctx.fillRect(0,0,W,H);
  const stripes=[0,71,182,292,403,513,624,734,846,956,1067,1177,1288,1399,1468];for(let i=0;i<stripes.length-1;i++)rect(fx(stripes[i]),0,fx(stripes[i+1]-stripes[i]),D,i%2?'#126b19':'#297f38');
  rect(0,0,L,D,null,white);path([[L/2,0,0],[L/2,D,0]],{stroke:white,width:1.4});
  path(Array.from({length:25},(_,i)=>[fx(734+115.5*Math.cos(i*Math.PI/12)),fz(550+115.5*Math.sin(i*Math.PI/12)),0]),{stroke:white,width:1.4});
  for(const side of [0,L]){const sign=side===0?1:-1;for(const [depth,start,end] of [[202,309,792],[71,437,665]])path([[side,fz(start),0],[side+sign*fx(depth),fz(start),0],[side+sign*fx(depth),fz(end),0],[side,fz(end),0]],{stroke:white,width:1.4});
   const z1=fz(485),z2=fz(615),back=side-sign*fx(93),gh=G.illustrativeGoalHeight;rect(Math.min(side,back),z1,Math.abs(back-side),z2-z1,'rgba(215,245,232,.12)',white);if(zoom!=='top'){path([[side,z1,0],[side,z1,gh],[side,z2,gh],[side,z2,0]],{stroke:white,width:2});path([[side,z1,gh],[back,z1,gh],[back,z2,gh],[side,z2,gh]],{stroke:'#b8d8c9'});}
  }
  // 20-stud reference ruler, independent of the zoom.
  ctx.strokeStyle='#e4f1e6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,H-24);ctx.lineTo(18+20*scale,H-24);ctx.stroke();ctx.font='12px system-ui';ctx.fillStyle='#e4f1e6';ctx.textAlign='left';ctx.fillText('20 studs',18,H-30);
  const shadow=(p,r)=>{const [x,y]=pr([p[0],p[1],0]);ctx.fillStyle='rgba(0,0,0,.26)';ctx.beginPath();ctx.ellipse(x,y,r*scale,r*scale*pitch,0,0,Math.PI*2);ctx.fill();};
  if(scene.trail?.length>1)path(scene.trail,{stroke:'#fbe8a6',width:1.5});
  if(scene.playerTrail?.length>1)path(scene.playerTrail.map(p=>[p[0],p[1],.05]),{stroke:'#9ad6ff',width:1.5,dash:[3,4]});
  function box(x,z,y,w,d,h,color){const p0=[x-w/2,z-d/2,y],p1=[x+w/2,z-d/2,y],p2=[x+w/2,z+d/2,y],p3=[x-w/2,z+d/2,y],a=[p0,p1,p2,p3],b=a.map(p=>[p[0],p[1],p[2]+h]);path([a[3],a[2],b[2],b[3]],{fill:color,stroke:'#193647',close:true,width:.7});path([a[1],a[2],b[2],b[1]],{fill:color,stroke:'#193647',close:true,width:.7});path(b,{fill:color,stroke:'#193647',close:true,width:.7});}
  const drawDummy=p=>{const [x,z,y=0]=p.pos,c=p.role==='enemy'?'#ed7779':p.role==='team'?'#a0e0a4':'#75c9ff',stride=p.moving?Math.sin(scene.time*17)*.45:0;shadow(p.pos,1.7);if(zoom==='top'){const [u,v]=pr(p.pos);ctx.fillStyle=c;ctx.fillRect(u-1.5*scale,v-1.5*scale,3*scale,3*scale);}else{box(x-.5,z+stride,y,.86,1.05,2,'#2c3f58');box(x+.5,z-stride,y,.86,1.05,2,'#2c3f58');box(x,z,y+2,2,1.1,2,c);box(x-1.35,z-stride,y+1.9,.7,1,1.85,c);box(x+1.35,z+stride,y+1.9,.7,1,1.85,c);box(x,z,y+4,1.35,1.3,1.3,'#e3d6ba');}
   const [u,v]=pr([x,z,y+5.7]);ctx.font='600 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#eaf4f5';ctx.fillText(p.label,u,v-5);
  };
  scene.people.slice().sort((a,b)=>pr(a.pos)[1]-pr(b.pos)[1]).forEach(drawDummy);
  if(scene.ball){shadow(scene.ball,.775);const [x,y]=pr(scene.ball),r=.775*scale;ctx.fillStyle='#f4f6e9';ctx.strokeStyle='#263c3c';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,Math.max(2,r),0,Math.PI*2);ctx.fill();ctx.stroke();}
 }
 return {canvas,draw};
}
export function renderFieldSimulation({name,id,manual=false,selection=[],info=null,implementation=null,branchLabel=''}){
 const options=fieldComponents(id,name,manual,implementation),root=el('details');root.className='am-box';root.append(el('summary','Field simulation · '+(options.length?'formula components':'source unresolved')+(branchLabel?' · '+branchLabel:'')));
 let initialized=false;
 root.addEventListener('toggle',()=>{if(!root.open||initialized)return;initialized=true;
  if(!options.length){root.append(el('p','No complete numeric motion or ball-response model has been recovered for this implementation. Activation and server-dependent actions are documented below; no invented dummy motion is shown.'));if(info)root.append(el('p',info.note));return;}
  const wrap=el('div');wrap.style.cssText='display:grid;gap:8px';root.append(wrap);
  const controls=el('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center';wrap.append(controls);
  function select(label,items){const l=el('label',label+' '),s=el('select');s.style.cssText='max-width:100%;background:#142431;color:inherit';for(const [v,t] of items){const o=el('option',t);o.value=v;s.append(o);}l.append(s);controls.append(l);return s;}
  const component=select('Component',options.map((o,i)=>[i,o.label])),camera=select('Camera',[['follow','Follow action'],['field','Whole pitch'],['top','Top down']]);
  const settings=el('details'),config=el('div');settings.append(el('summary','Scenario settings'),config);config.style.cssText='display:flex;flex-wrap:wrap;gap:8px;padding-top:8px';wrap.append(settings);
  const note=el('p'),status=el('p'),view=makeView();wrap.append(note,view.canvas,status);
  const ctrl=previewControls(),slider=el('input');slider.type='range';slider.min=0;slider.step='0.01';slider.style.width='100%';slider.setAttribute('aria-label','Simulation time');wrap.append(ctrl.bar,slider);
  let time=0,max=1,draw=()=>{},rebuild=()=>{};
  const playback=bindPreviewPlayback({...ctrl,host:ctrl.bar,duration:()=>max,read:()=>time,render:t=>{time=t;slider.value=t;draw();}});
  function field(label,value,min,max,step=1){const l=el('label',label+' '),input=el('input');input.type='number';input.value=value;input.min=min;input.max=max;input.step=step;input.style.cssText='width:72px;max-width:100%;background:#142431;color:inherit';l.append(input);config.append(l);input.addEventListener('change',()=>{playback.pause();rebuild();});return input;}
  function setup(){playback.pause();config.replaceChildren();const o=options[+component.value],s=o.spec;
   const known=o.partial?'Partial / scenario inputs; not measured server motion.':'Source-derived component model; server and collision behavior may differ.';
   note.textContent=known+' '+(s.description||s.note||'')+' Field scale: replay calibration in studs. Ground/goal height illustrative. Only this component is simulated, not the full activation sequence.';
   const angle=field('Aim / body yaw °',0,-180,180),ox=field('Start X (stud)',Math.round(L*.35),5,L-5),oz=field('Start Z (stud)',Math.round(D*.5),5,D-5);
   if(o.kind==='movement'||o.kind==='combined'){
    const motion=o.kind==='combined'?s.motion:s,shot=o.kind==='combined'?s.shot:null;
    const ballMode=shot?null:select('Ball',[['none','Not modeled'],['carry','With dummy (scenario)']]);if(ballMode){config.append(ballMode.parentElement);if(/\bon-ball\b|^Possession$/i.test(selection.join(' / '))&&!/off-ball|without possession/i.test(selection.join(' / ')))ballMode.value='carry';}
    const hasOpponent=!!info&&['steal','steal-pass','counter'].includes(info.kind);const enemyDistance=hasOpponent?field('Opponent distance (scenario)',20,2,120):null;
    const params=motion.params.map(p=>field(p.name+(p.value==null?' (scenario)':''),p.value??p.default??30,0,300,.1));const stageAngles=motion.locked||motion.vertical?[]:Array.from({length:Math.max(0,(motion.steer?2:motion.stages.length)-1)},(_,i)=>field('Stage '+(i+2)+' yaw offset °',0,-180,180));const mirror=motion.mirror?select('Side',[[1,'Right'],[-1,'Left']]):null;if(mirror)config.append(mirror.parentElement);
    rebuild=()=>{const origin=[+ox.value,+oz.value],opts={angles:Array.from({length:Math.max(2,motion.stages.length)},(_,i)=>+angle.value+(i>0?+(stageAngles[i-1]?.value||0):0)),params:params.map(p=>+p.value),mirror:mirror?+mirror.value:1};const result=shot?straightFlight({power:shot.p,tilt:shot.k,elevation:0,mode:shot.mode,horizontalFacing:shot.horizontalFacing}):null;max=Math.max(.01,motion.total,result?.t||0);time=0;slider.max=max;slider.value=0;
     const point=t=>{const r=movementAt(motion,opts,Math.min(t,motion.total));return motion.vertical?[origin[0],origin[1],Math.max(0,r.z)]:[clamp(origin[0]+r.z,0,L),clamp(origin[1]+r.x,0,D),0];};
     draw=()=>{const p=point(time),trail=Array.from({length:24},(_,i)=>point(Math.min(time,motion.total)*i/23)),f=result?sample(result.points,Math.min(time,result.t)):null,a=+angle.value*Math.PI/180,b=f?[origin[0]+f.z*Math.cos(a)-f.x*Math.sin(a),origin[1]+f.z*Math.sin(a)+f.x*Math.cos(a),Math.max(0,f.y-FLOOR)]:ballMode?.value==='carry'?[p[0]+Math.cos(a)*1.7,p[1]+Math.sin(a)*1.7,p[2]+.775]:null;const people=[{role:'player',label:'Player',pos:p,moving:time>0&&time<motion.total}];if(enemyDistance)people.push({role:'enemy',label:'Opponent (scenario)',pos:[clamp(origin[0]+Math.cos(a)*+enemyDistance.value,0,L),clamp(origin[1]+Math.sin(a)*+enemyDistance.value,0,D),0]});view.draw({people,ball:b,playerTrail:trail,time},camera.value);status.textContent=time.toFixed(2)+' / '+max.toFixed(2)+' s · target displacement '+Math.hypot(p[0]-origin[0],p[1]-origin[1],p[2]).toFixed(1)+' studs';};draw();
    };if(ballMode)ballMode.addEventListener('change',()=>draw());if(mirror)mirror.addEventListener('change',()=>{playback.pause();rebuild();});
   }else{
    const power=o.kind==='pass'?null:field('Power'+(s.p==null?' (scenario)':''),s.p??s.powers?.[0]??150,1,400),tilt=o.kind==='pass'?null:field('Tilt'+(s.k==null&&s.tilt==null?' (scenario)':''),s.k??s.tilt??.2,-1,1,.01);
    const elevation=o.kind==='pass'?null:field('Elevation °',0,-45,75),distance=o.kind==='pass'||s.kind==='pass'?field('Receiver distance',70,5,400):null;
    const bearing=distance?field('Receiver bearing °',0,-180,180):null,receiverSpeed=distance?field('Receiver speed',0,0,35):null,receiverYaw=distance?field('Receiver movement °',90,-180,180):null;
    rebuild=()=>{const origin=[+ox.value,+oz.value],yaw=+angle.value*Math.PI/180,rotate=p=>{const a=world(p,origin),x=a[0]-origin[0],z=a[1]-origin[1];return [origin[0]+x*Math.cos(yaw)-z*Math.sin(yaw),origin[1]+x*Math.sin(yaw)+z*Math.cos(yaw),a[2]];};
     const receiverOptions=distance?{distance:+distance.value,bearing:+bearing.value,receiverSpeed:+receiverSpeed.value,receiverYaw:+receiverYaw.value}:null;
     let result=o.kind==='pass'?guidedFlight(s,receiverOptions):o.kind==='curve'?curveFlight(s,{power:+power.value,tilt:+tilt.value,elevation:+elevation.value}):straightFlight({power:+power.value,tilt:+tilt.value,elevation:+elevation.value,mode:s.mode,horizontalFacing:s.horizontalFacing,verticalSpin:s.verticalSpin});
     if(o.kind==='curve'&&receiverOptions)result=withReceiver(result,receiverOptions);
     max=Math.max(.01,result.t);time=0;slider.max=max;slider.value=0;
     draw=()=>{const p=sample(result.points,time);if(!p)return;const b=rotate(p),people=[{role:'player',label:'Player',pos:[...origin,0]}];if(p.receiver){const a=p.receiver;people.push({role:'team',label:'Receiver',pos:rotate({x:a[0],y:FLOOR,z:a[2]})});}
      const trail=Array.from({length:24},(_,i)=>rotate(sample(result.points,Math.max(0,time-.65)+Math.min(time,.65)*i/23))).filter(a=>a[0]>=0&&a[0]<=L&&a[1]>=0&&a[1]<=D);
      const inside=b[0]>=0&&b[0]<=L&&b[1]>=0&&b[1]<=D;view.draw({people,ball:inside?b:null,trail,time},camera.value);status.textContent=time.toFixed(2)+' / '+max.toFixed(2)+' s · ball displacement '+Math.hypot(b[0]-origin[0],b[1]-origin[1]).toFixed(1)+' studs'+(inside?'':' · outside calibrated pitch; wall response not modeled');};draw();
    };
   }rebuild();
  }
  component.addEventListener('change',setup);camera.addEventListener('change',drawCamera);function drawCamera(){draw();}
  slider.addEventListener('input',()=>{playback.pause();time=+slider.value;draw();});setup();
 });return root;
}
