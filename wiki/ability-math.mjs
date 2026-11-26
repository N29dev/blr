// Mathematical gameplay illustrations. No original game code or assets.
// A projectile model is an illustration, not a measurement of BL:R's ball drag or gravity.
const S='http://www.w3.org/2000/svg';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
function svg(tag,attrs={},text){const n=document.createElementNS(S,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!=null)n.textContent=text;return n;}
const fmt=(v,d=1)=>Number(v.toFixed(d)).toString();
const rad=d=>d*Math.PI/180;
export function launch(power,tilt,angle){const a=rad(angle),vx=power*Math.cos(a),vy=power*(Math.sin(a)+tilt);return {vx,vy,speed:Math.hypot(vx,vy),angle:Math.atan2(vy,vx)*180/Math.PI};}
export function ballistic(vx,vy,g,h){const t=(vy+Math.sqrt(vy*vy+2*g*h))/g;return {t,range:vx*t,height:h+Math.max(0,vy)**2/(2*g)};}
// Coordinates: right and forward, relative to facing at the start of the curved phase.
export function steeringTarget(u){return {x:60*u*(1-u),y:-50*u};}
const shots={
 'Trap Shot':{p:130,k:.35,confirmed:true},
 'I Am Nagi':{p:161.5,k:.2,confirmed:true},
 'Breakdance Shot':{p:170,k:.1,helper:'Shared shot helper'},
 'Direct Heel Lift':{p:160,k:.15,helper:'Shared shot helper'},
 'Effortless Miracle':{p:200,k:.1,helper:'Shared cutscene helper'},
 'Five Stage Volley':{p:200,k:.18,helper:'Shared cutscene helper'},
 'Two Stage Volley':{p:171,k:.18,helper:'Shared cutscene helper'}
};
const css=`
#technical-abilities .am-box{margin-top:9px}
#technical-abilities .am-title{font-size:.8rem;color:#b8cfe7;font-weight:600}
#technical-abilities .am-caption{font-size:.73rem!important;color:#a9bbce!important;line-height:1.45}
#technical-abilities .am-formula{font: .84rem/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;background:#101923;border:1px solid #303d4c;border-radius:6px;padding:8px 10px;margin:8px 0;overflow-wrap:anywhere;white-space:pre-wrap;color:#dceaff}
#technical-abilities .am-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:9px 0}
#technical-abilities .am-controls label{display:grid;gap:5px;min-width:0;font-size:.76rem;color:#b7c6d8}
#technical-abilities .am-controls input{width:100%;min-width:0;accent-color:#9ac9ff}
#technical-abilities .am-controls input[type=number]{box-sizing:border-box;background:#101923;color:#edf4ff;border:1px solid #405267;border-radius:5px;padding:6px;font:inherit}
#technical-abilities .am-controls output{color:#e5f1ff;font-weight:600;font-variant-numeric:tabular-nums}
#technical-abilities .am-svg{display:block;width:100%;height:auto;background:#101923;border:1px solid #303d4c;border-radius:7px}
#technical-abilities .am-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}
#technical-abilities .am-metrics div{background:#101923;padding:7px;border-radius:5px;min-width:0}
#technical-abilities .am-metrics dt{font-size:.7rem}
#technical-abilities .am-metrics dd{font-size:.85rem;overflow-wrap:anywhere}
@media(max-width:520px){#technical-abilities .am-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
function diagram(label,w=480,h=230){return svg('svg',{viewBox:'0 0 '+w+' '+h,class:'am-svg',role:'img','aria-label':label});}
function line(g,x1,y1,x2,y2,color='#405267',dash){g.append(svg('line',{x1,y1,x2,y2,stroke:color,'stroke-width':1.2,...(dash?{'stroke-dasharray':dash}:{})}));}
function label(g,x,y,t,anchor='start',color='#aebed1'){g.append(svg('text',{x,y,fill:color,'font-size':11,'font-family':'system-ui','text-anchor':anchor},t));}
function dot(g,x,y,color='#9ac9ff',r=3){g.append(svg('circle',{cx:x,cy:y,r,fill:color}));}
function arrow(g,x1,y1,x2,y2,color){line(g,x1,y1,x2,y2,color);const a=Math.atan2(y2-y1,x2-x1);g.append(svg('path',{d:'M '+x2+' '+y2+' L '+(x2-8*Math.cos(a-.5))+' '+(y2-8*Math.sin(a-.5))+' L '+(x2-8*Math.cos(a+.5))+' '+(y2-8*Math.sin(a+.5))+' Z',fill:color}));}
function metric(dl,name,value){const d=el('div');d.append(el('dt',name),el('dd',value));dl.append(d);}
function slider(parent,title,min,max,step,value){const l=el('label'),out=el('output'),input=el('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;input.setAttribute('aria-label',title);l.append(el('span',title),input,out);parent.append(l);return {input,out};}
function numeric(parent,title,min,max,step,value){const l=el('label'),i=el('input');i.type='number';i.min=min;i.max=max;i.step=step;i.value=value;i.setAttribute('aria-label',title);l.append(el('span',title),i);parent.append(l);return i;}
function shotView(root,shot){
 const {p,k,confirmed}=shot;
 if(!confirmed){root.append(el('p',shot.helper+' receives the ability configuration. The actual normalization, launch speed and drag law are not established by the supplied ability module.','am-caption'),el('div','P = '+p+';  vertical tilt = '+k,'am-formula'));return;}
 root.append(el('div','vₓ = '+p+' cos θ\nvᵧ = '+p+' (sin θ + '+k+')\nα = atan2(vᵧ, vₓ)','am-formula'));
 const controls=el('div',null,'am-controls'),angle=slider(controls,'Camera elevation (degrees)',-45,75,1,15),gravity=numeric(controls,'Model gravity (stud/s²)',1,1000,1,196.2),height=numeric(controls,'Launch height (studs)',0,100,0.5,0);
 const vector=diagram('Camera elevation and initial velocity vectors',480,150),chart=diagram('Idealized ball trajectory, height versus distance'),stats=el('dl',null,'am-metrics');
 root.append(controls,vector,stats,chart,el('p','Launch vector: client-derived. Flight preview: constant downward gravity, no drag, no collisions or bounces; gravity and height are user-selected model assumptions, not measured BL:R values.','am-caption'),el('div','x(t) = vₓt\ny(t) = h + vᵧt − gt²/2\nT = (vᵧ + √(vᵧ² + 2gh))/g;  R = vₓT','am-formula'));
 function draw(){
  const theta=Number(angle.input.value),v=launch(p,k,theta),g=Math.max(1,Math.min(1000,Number(gravity.value)||196.2)),h=Math.max(0,Math.min(100,Number(height.value)||0)),b=ballistic(v.vx,v.vy,g,h);
  angle.out.value=theta+'°';vector.replaceChildren();chart.replaceChildren();stats.replaceChildren();
  const ox=65,oy=78,scale=49/Math.max(p,v.speed);line(vector,20,oy,455,oy);label(vector,20,16,'Launch vectors · side view');label(vector,310,oy-8,'Horizontal');
  arrow(vector,ox,oy,ox+p*Math.cos(rad(theta))*scale,oy-p*Math.sin(rad(theta))*scale,'#b7c3d0');
  arrow(vector,ox,oy,ox+v.vx*scale,oy-v.vy*scale,'#89d6a9');
  dot(vector,ox,oy,'#edf4ff');label(vector,205,35,'Camera θ = '+theta+'°','start','#b7c3d0');label(vector,205,53,'Launch α = '+fmt(v.angle)+'°','start','#89d6a9');label(vector,205,114,'vₓ = '+fmt(v.vx)+' · vᵧ = '+fmt(v.vy)+' stud/s');
  metric(stats,'Launch speed',fmt(v.speed)+' stud/s');metric(stats,'Flight time (model)',fmt(b.t,2)+' s');metric(stats,'Landing range (model)',fmt(b.range)+' studs');
  const x0=46,y0=192,xmax=Math.max(10,b.range)*1.08,ymax=Math.max(5,b.height)*1.12,sx=410/xmax,sy=165/ymax;
  for(let i=0;i<=4;i++){const x=xmax*i/4,y=ymax*i/4;line(chart,x0+x*sx,27,x0+x*sx,y0,'#253443');line(chart,x0,y0-y*sy,456,y0-y*sy,'#253443');label(chart,x0+x*sx,208,fmt(x,0),'middle');label(chart,40,y0-y*sy+4,fmt(y,0),'end');}
  line(chart,x0,27,x0,y0);line(chart,x0,y0,456,y0);label(chart,46,16,'Height (studs)');label(chart,456,224,'Distance (studs)','end');
  const points=[];for(let i=0;i<=100;i++){const t=b.t*i/100;points.push((x0+v.vx*t*sx)+','+(y0-Math.max(0,h+v.vy*t-g*t*t/2)*sy));}chart.append(svg('polyline',{points:points.join(' '),fill:'none',stroke:'#89d6a9','stroke-width':2.4,'stroke-linejoin':'round'}));dot(chart,x0,y0-h*sy);dot(chart,x0+b.range*sx,y0,'#89d6a9');
 }
 for(const i of [angle.input,gravity,height])i.addEventListener('input',draw);draw();
}
function turnView(root){
 root.append(el('div','P₀ = (0, 0), P₁ = (30, −25), P₂ = (0, −50)\nB(u) = (1−u)²P₀ + 2u(1−u)P₁ + u²P₂\nB(u) = (60u(1−u), −50u),  0 ≤ u ≤ 1\nTarget speed = 1.8 × 63 = 113.4 stud/s','am-formula'));
 const controls=el('div',null,'am-controls'),progress=slider(controls,'Steering target u',0,1,.1,.5),g=diagram('Zero Reset Turn top-down steering target curve',480,260),stats=el('dl',null,'am-metrics');root.append(controls,g,stats);
 root.append(el('p','Coordinates use right (+x) and forward (+y) relative to facing when the curved phase starts. An initial forward target of 5 studs precedes this phase; after a 0.2 s delay, 10 target steps use 0.02 s tweens. The curve is a series of steering targets, not a measured character path. BodyVelocity points toward each target; collisions, tween scheduling and actual character position affect movement.','am-caption'));
 function draw(){
  const u=Number(progress.input.value),p=steeringTarget(u),s=3.8,ox=135,oy=30,X=x=>ox+x*s,Y=y=>oy-y*s;progress.out.value=fmt(u,1);g.replaceChildren();stats.replaceChildren();
  for(let x=-20;x<=70;x+=10)line(g,X(x),12,X(x),239,'#253443');for(let y=-50;y<=0;y+=10){line(g,28,Y(y),449,Y(y),'#253443');label(g,25,Y(y)+4,String(y),'end');}
  arrow(g,X(0),Y(0)+15,X(0),12,'#91bce6');label(g,45,17,'Forward');line(g,X(0),Y(0),X(30),Y(-25),'#647a91','4 4');line(g,X(30),Y(-25),X(0),Y(-50),'#647a91','4 4');
  g.append(svg('path',{d:'M '+X(0)+' '+Y(0)+' Q '+X(30)+' '+Y(-25)+' '+X(0)+' '+Y(-50),stroke:'#9ac9ff','stroke-width':2.6,fill:'none'}));
  for(let i=0;i<=10;i++){const q=steeringTarget(i/10);dot(g,X(q.x),Y(q.y),'#9ac9ff',2.6);}
  dot(g,X(30),Y(-25),'#e6b66e',4);label(g,X(30)+8,Y(-25),'P₁ control (30, −25)');label(g,X(0)+8,Y(0)+12,'P₀ start');label(g,X(0)+8,Y(-50)+12,'P₂ target');dot(g,X(p.x),Y(p.y),'#89d6a9',6);
  label(g,450,250,'Right → (studs)','end');metric(stats,'Right target',fmt(p.x)+' studs');metric(stats,'Forward target',fmt(p.y)+' studs');metric(stats,'Target speed','113.4 stud/s');
 }
 progress.input.addEventListener('input',draw);draw();
}
function movementView(root,name){
 const g=diagram(name==='Dash'?'Lateral direction preview':'Forward dash target preview',480,125);
 const ox=240,oy=75;dot(g,ox,oy,'#edf4ff',5);arrow(g,ox,oy,ox,20,'#647a91');label(g,ox+10,22,'Facing');
 if(name==='Dash'){arrow(g,ox-10,oy,70,oy,'#9ac9ff');arrow(g,ox+10,oy,410,oy,'#9ac9ff');label(g,70,98,'Left','middle');label(g,410,98,'Right','middle');root.append(el('div','d = −RightVector if local movement X < 0; otherwise +RightVector','am-formula'),g,el('p','Direction only. Dash length and speed are not specified in the client module. Diagram is not to scale.','am-caption'));}
 else{g.replaceChildren();const x=90,y=90;dot(g,x,y,'#edf4ff',5);arrow(g,x,y,390,y,'#9ac9ff');dot(g,390,y,'#89d6a9',4);label(g,x,110,'Start','middle');label(g,390,110,'Target','middle');label(g,240,74,'60 studs forward','middle');root.append(el('div','Target = player position + 60 × forward direction\nDash time parameter = 0.5 s','am-formula'),g,el('p','Target position, not measured displacement. The shared dash helper determines the realized motion.','am-caption'));}
}
export function renderAbilityMath(name){
 if(!shots[name]&&!['Zero Reset Turn','Dash'].includes(name))return null;
 const section=el('details',null,'am-box');section.append(el('summary',name==='Zero Reset Turn'?'Mathematical steering path':name==='Dash'?'Movement direction diagram':'Math & trajectory preview'),el('style',css));
 const body=el('div');section.append(body);let initialized=false;
 function init(){if(initialized)return;initialized=true;if(name==='Zero Reset Turn')turnView(body);else if(name==='Dash')movementView(body,name);else{if(name==='Direct Heel Lift')movementView(body,name);shotView(body,shots[name]);}}
 section.addEventListener('toggle',()=>{if(section.open)init();});return section;
}
