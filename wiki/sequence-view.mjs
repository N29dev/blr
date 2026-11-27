// Lightweight, lazy Canvas 2.5D renderer. Scene distances/heights are normalized
// presentation coordinates, not measured BL:R field units. No WebGL or dependencies.
const W=820,H=450;
const palette={player:'#55baff',enemy:'#f36c78',team:'#92e5ad'};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')';};
export function createSequenceView(){
 const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Perspective gameplay preview');canvas.style.cssText='display:block;width:100%;aspect-ratio:820/450;border:1px solid #37574f;border-radius:10px;background:#0b1820';
 const ctx=canvas.getContext('2d');let camera='tactical',last=null;
 function render(scene){
  last=scene;if(!ctx)return;
  const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(W*dpr),h=Math.round(H*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(dpr,0,0,dpr,0,0);
  // Camera orbit about field centre. Camera depth gives true perspective foreshortening.
  const settings=camera==='side'?[-.08,.37,505]:camera==='goal'?[1.12,.57,520]:[-.28,.68,510], [yaw,pitch,dist]=settings;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),focal=800;
  function project(x,z,y=0){const dx=x-210,dz=z-107.5,rx=dx*cy-dz*sy,rz=dx*sy+dz*cy,depth=dist-rz*cp-y*sp,k=focal/Math.max(100,depth);return {x:W/2+rx*k,y:H*.51+(rz*sp-y*cp)*k,k,depth};}
  function poly(points,fill,stroke,width=1){const pp=points.map(p=>project(...p));ctx.beginPath();for(let i=0;i<pp.length;i++)i?ctx.lineTo(pp[i].x,pp[i].y):ctx.moveTo(pp[i].x,pp[i].y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function line(points,color,width=1,dash=[]){ctx.beginPath();points.forEach((p,i)=>{const v=project(...p);i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
  function circleGround(x,z,r,color,fill=null){const pts=Array.from({length:49},(_,i)=>[x+Math.cos(i*Math.PI/24)*r,z+Math.sin(i*Math.PI/24)*r,0]);poly(pts,fill,color,1.3);}
  function shadow(x,z,r,alpha=.25){const p=project(x,z);ctx.fillStyle='rgba(0,0,0,'+alpha+')';ctx.beginPath();ctx.ellipse(p.x,p.y,r*p.k,r*p.k*sp,0,0,Math.PI*2);ctx.fill();}
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#102637');bg.addColorStop(1,'#08191a');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  poly([[-9,-8,-7],[429,-8,-7],[429,223,-7],[-9,223,-7]],'#0b2825');
  poly([[-9,-8,0],[429,-8,0],[429,223,0],[-9,223,0]],'#17443a','#47765d',1.2);
  for(let i=0;i<10;i++){let x=10+i*40;poly([[x,10],[x+40,10],[x+40,205],[x,205]],i%2?'#245b46':'#28664c');}
  const white='rgba(214,242,219,.72)';
  poly([[10,10],[410,10],[410,205],[10,205]],null,white,1.5);
  line([[210,10],[210,205]],white,1.5);circleGround(210,107.5,35,white);
  for(const side of [10,410]){const dir=side===10?1:-1;line([[side,55],[side+dir*49,55],[side+dir*49,160],[side,160]],white,1.3);line([[side,82],[side+dir*18,82],[side+dir*18,133],[side,133]],white,1.3);
   // Goal frame and net volume.
   const back=side-dir*12;poly([[side,88,0],[back,88,0],[back,127,0],[side,127,0]],'rgba(219,241,232,.07)');
   for(let z=88;z<=127;z+=6)line([[back,z,0],[back,z,18],[side,z,18]],'rgba(215,237,231,.17)',.8);
   for(let y=0;y<=18;y+=5)line([[back,88,y],[back,127,y]],'rgba(215,237,231,.17)',.8);
   line([[side,88,0],[side,88,18],[side,127,18],[side,127,0]],'#dcece4',2.3);
   line([[side,88,18],[back,88,18],[back,127,18],[side,127,18]],'rgba(215,237,231,.65)',1.2);
  }
  const {people,ball,stage,u,stopped,trail=[],playerTrail=[]}=scene;
  for(const p of people)shadow(p.pos[0],p.pos[1],7.5,.28/(1+(p.pos[2]||0)/20));
  if(ball)shadow(ball[0],ball[1],4.2,.34/(1+(ball[2]||0)/20));
  if(playerTrail.length>1)line(playerTrail.map(p=>[p[0],p[1],.15]),'rgba(109,193,255,.40)',2.3,[3,6]);
  if(trail.length>1){line(trail.map(p=>[p[0],p[1],.2]),'rgba(236,245,199,.25)',1.3,[3,5]);line(trail,'rgba(255,220,141,.68)',2.2);}
  const hero=people.find(p=>p.role==='player');
  if(hero&&!stopped&&['contact','duel','enable','hold','disable'].includes(stage)){
   const pulse=stage==='enable'?u:stage==='disable'?1-u:1;circleGround(hero.pos[0],hero.pos[1],15+3*Math.sin(u*Math.PI),rgba(stage==='duel'?'#f7bd87':'#8bd3ff',.7*pulse),rgba('#8bd3ff',.08*pulse));
  }
  function capsule(a,b,r,c){const pa=project(...a),pb=project(...b);ctx.strokeStyle=c;ctx.lineWidth=r*(pa.k+pb.k)/2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();}
  function orb(pt,r,color){const p=project(...pt),R=r*p.k;const g=ctx.createRadialGradient(p.x-R*.35,p.y-R*.4,R*.08,p.x,p.y,R);g.addColorStop(0,'#ffffff');g.addColorStop(.22,color);g.addColorStop(1,'#263b49');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,R,0,Math.PI*2);ctx.fill();}
  function humanoid(person){
   const [x,z,y=0]=person.pos,color=palette[person.role],yaw=person.yaw||0,dx=Math.cos(yaw),dz=Math.sin(yaw),rx=-dz,rz=dx,m=person.moving?1:0,j=stage==='jump'&&person.role==='player'?1:0,cycle=person.stride||0;
   const stride=Math.sin(cycle)*4.5*m,lean=m*2.3;
   const pt=(f,r,h)=>[x+dx*f+rx*r,z+dz*f+rz*r,y+h];
   const pelvis=pt(lean*.3,0,10),chest=pt(lean,0,19),head=pt(lean+.1,0,25);
   for(const sign of [-1,1]){const swing=sign*stride;const hip=pt(lean*.3,sign*2.2,10),knee=pt(swing*.55,sign*2.5,5.2+j*2),foot=pt(swing,sign*2.8,1+Math.max(0,-swing)*.3+j*2);capsule(hip,knee,3.5,'#25354a');capsule(knee,foot,3.1,'#d3e0e7');capsule(foot,[foot[0]+dx*2,foot[1]+dz*2,foot[2]],3.6,'#142936');}
   capsule(pelvis,chest,8.7,'#203b50');capsule(pt(lean*.6,0,13.3),chest,7.7,color);
   for(const sign of [-1,1]){const shoulder=pt(lean,sign*4,18),elbow=pt(-sign*stride*.5,sign*(5+j*2),13+j*5),hand=pt(-sign*stride*.7,sign*(5+j*3),9+j*7);capsule(shoulder,elbow,3.7,color);capsule(elbow,hand,3,'#d8b7a2');}
   orb(head,4.2,'#e3bc9e');capsule(pt(lean,0,27.3),pt(lean-.5,0,27.8),6.6,'#233748');
   const label=project(...pt(0,0,33));ctx.font='600 12px system-ui,sans-serif';const text=person.label;const width=ctx.measureText(text).width+14;ctx.fillStyle='rgba(9,21,28,.84)';ctx.beginPath();ctx.roundRect(label.x-width/2,label.y-12,width,18,5);ctx.fill();ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,label.x,label.y+1);
  }
  const objects=people.map(p=>({d:project(p.pos[0],p.pos[1]).depth,draw:()=>humanoid(p)}));if(ball)objects.push({d:project(...ball).depth,draw:()=>{
   const p=project(...ball),r=3.6*p.k;const g=ctx.createRadialGradient(p.x-r*.35,p.y-r*.4,r*.15,p.x,p.y,r);g.addColorStop(0,'#fff');g.addColorStop(.6,'#f5f2e6');g.addColorStop(1,'#b7c4c2');ctx.beginPath();ctx.arc(p.x,p.y,r,0,2*Math.PI);ctx.fillStyle=g;ctx.fill();
   ctx.save();ctx.clip();ctx.fillStyle='#293849';ctx.beginPath();for(let i=0;i<5;i++){const a=i*2*Math.PI/5-.5;const x=p.x+Math.cos(a)*r*.37,y=p.y+Math.sin(a)*r*.37;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();for(let i=0;i<3;i++){const a=i*2*Math.PI/3+u*.9;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*r*.88,p.y+Math.sin(a)*r*.88,r*.24,0,2*Math.PI);ctx.fill();}ctx.restore();
  }});objects.sort((a,b)=>b.d-a.d).forEach(o=>o.draw());
  if(stopped){ctx.fillStyle='rgba(11,22,31,.80)';ctx.fillRect(14,14,184,27);ctx.font='600 12px system-ui';ctx.fillStyle='#ff9d9d';ctx.textAlign='left';ctx.fillText('REJECTED · sequence stopped',23,32);}
  ctx.font='11px system-ui';ctx.textAlign='right';ctx.fillStyle='rgba(232,244,242,.65)';ctx.fillText('ILLUSTRATIVE REPLAY',W-15,22);
 }
 return {canvas,render,setCamera(v){camera=v;if(last)render(last);}};
}
