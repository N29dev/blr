import {renderStraight3D} from './flight-3d.mjs?v=1';
import {shotVelocity,dashTarget,trajectory,interpolateFlight} from './physics-model.mjs?v=2';
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

const M='http://www.w3.org/1998/Math/MathML';
function mathNode(tag,children=[]){const n=document.createElementNS(M,tag);for(const c of children){if(typeof c==='string')n.append(document.createTextNode(c));else n.append(c);}return n;}
const mi=x=>mathNode('mi',[x]),mn=x=>mathNode('mn',[String(x)]),mo=x=>mathNode('mo',[x]),row=(...x)=>mathNode('mrow',x),sub=(a,b)=>mathNode('msub',[a,b]),sup=(a,b)=>mathNode('msup',[a,b]),frac=(a,b)=>mathNode('mfrac',[a,b]),sqrt=a=>mathNode('msqrt',[a]),v=x=>mi(x),op=x=>mo(x);
function equation(...rows){const box=el('div',null,'am-equations');for(const r of rows){const math=mathNode('math',[r]);math.setAttribute('display','block');box.append(math);}return box;}
function playback(root,{duration=()=>1,draw,step=0.001,labelText='Playback progress',initial=0}){
 const bar=el('div',null,'am-playback'),button=el('button','▶ Play','am-play'),reset=el('button','↺','am-reset'),range=el('input'),out=el('output');
 button.type=reset.type='button';reset.setAttribute('aria-label','Reset playback');range.type='range';range.min=0;range.max=1;range.step=step;range.value=initial;range.setAttribute('aria-label',labelText);
 bar.append(button,reset,range,out);root.append(bar);let frame=0,running=false,last=0,p=initial;
 function render(){range.value=p;out.value=fmt(p*duration(),2)+' s';draw(p);}
 function pause(){running=false;cancelAnimationFrame(frame);button.textContent='▶ Play';button.setAttribute('aria-pressed','false');}
 function tick(now){if(!running||!bar.isConnected||!bar.closest('details')?.open){pause();return;}if(last)p=Math.min(1,p+(now-last)/1000/Math.max(.001,duration()));last=now;render();if(p>=1)pause();else frame=requestAnimationFrame(tick);}
 button.addEventListener('click',()=>{if(running){pause();return;}if(p>=1)p=0;running=true;last=0;button.textContent='Ⅱ Pause';button.setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);});
 reset.addEventListener('click',()=>{pause();p=0;render();});range.addEventListener('input',()=>{pause();p=Number(range.value);render();});
 return {refresh:render,pause};
}
// Ideal steering-only approximation: integrate unit vectors toward each sampled
// target with piecewise constant directions. It omits tween easing, acceleration and physics.
export function simulatedSteering(u){
 let x=0,y=0,dx=0,dy=1;const dt=.001,speed=113.4,steps=Math.floor(Math.max(0,Math.min(1,u))*.2/dt+1e-8);
 for(let i=0;i<steps;i++){const phase=Math.floor(i/20),q=steeringTarget((phase+1)/10);if(i%20===0){const l=Math.hypot(q.x-x,q.y-y)||1;dx=(q.x-x)/l;dy=(q.y-y)/l;}x+=dx*speed*dt;y+=dy*speed*dt;}
 return {x,y};
}

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
#technical-abilities .am-equations{display:grid;gap:6px;background:#101923;border:1px solid #303d4c;border-radius:7px;padding:10px;margin:8px 0;overflow-x:auto;color:#e4edff}
#technical-abilities .am-equations math{font-size:1.13rem;min-width:max-content;margin:4px auto}
#technical-abilities .am-playback{display:flex;align-items:center;gap:7px;margin:8px 0;min-width:0}
#technical-abilities .am-playback button{background:#23384c;border:1px solid #41617c;white-space:nowrap;font-size:.78rem;color:#e5f1ff}
#technical-abilities .am-playback input{flex:1;min-width:30px;accent-color:#9ac9ff}
#technical-abilities .am-playback output{min-width:52px;text-align:right;font-size:.78rem;font-variant-numeric:tabular-nums;color:#b8cfe7}
#technical-abilities .am-timeline{display:flex;gap:2px;overflow:hidden;border-radius:5px;margin:8px 0;background:#101923}
#technical-abilities .am-timeline div{padding:7px 3px;min-width:0;text-align:center;font-size:.68rem;color:#b6c8da;background:#233446;overflow-wrap:anywhere}
#technical-abilities .am-timeline div[data-active=true]{background:#3b6487;color:white}
#technical-abilities .am-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:.74rem;color:#aebed1}
#technical-abilities .am-legend span:before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;background:var(--legend)}

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
function shotView(root,shot){renderStraight3D(root,shot);}
function turnView(root){
 root.append(equation(row(v('B'),op('('),v('u'),op(')'),op('='),sup(row(op('('),mn(1),op('−'),v('u'),op(')')),mn(2)),sub(v('P'),mn(0)),op('+'),mn(2),v('u'),op('('),mn(1),op('−'),v('u'),op(')'),sub(v('P'),mn(1)),op('+'),sup(v('u'),mn(2)),sub(v('P'),mn(2))),row(v('B'),op('('),v('u'),op(')'),op('='),op('('),mn(60),v('u'),op('('),mn(1),op('−'),v('u'),op(')'),op(','),op('−'),mn(50),v('u'),op(')')),row(mi('speed'),op('='),mn(1.8),op('×'),mn(63),op('='),mn(113.4),mi('stud/s'))));
 const controls=el('div',null,'am-controls'),progress=slider(controls,'Steering target u',0,1,.1,.5),g=diagram('Zero Reset Turn top-down steering target curve',480,260),stats=el('dl',null,'am-metrics');root.append(controls,g,stats);const timeline=el('div',null,'am-timeline');for(const [title,width] of [['0–0.1 s · forward target',1],['0.1–0.2 s · wait',1],['0.2–0.4 s · steering',2],['0.4–0.6 s · cleanup pending',2]]){const cell=el('div',title);cell.style.flex=String(width);timeline.append(cell);}root.append(timeline);const legend=el('div',null,'am-legend');for(const [name,color] of [['Steering target','#9ac9ff'],['Approximate player position','#e6b66e']]){const item=el('span',name);item.style.setProperty('--legend',color);legend.append(item);}root.append(legend);
 root.append(el('p','Coordinates use right (+x) and forward (+y) relative to facing when the curved phase starts. An initial forward target of 5 studs precedes this phase; after a 0.2 s delay, 10 target steps use 0.02 s tweens. The curve is a series of steering targets, not a measured character path. BodyVelocity points toward each target; collisions, tween scheduling and actual character position affect movement.','am-caption'));
 function draw(){
  const u=Number(progress.input.value),p=steeringTarget(u),s=3.8,ox=135,oy=30,X=x=>ox+x*s,Y=y=>oy-y*s;progress.out.value=fmt(u,1);g.replaceChildren();stats.replaceChildren();
  for(let x=-20;x<=70;x+=10)line(g,X(x),12,X(x),239,'#253443');for(let y=-50;y<=0;y+=10){line(g,28,Y(y),449,Y(y),'#253443');label(g,25,Y(y)+4,String(y),'end');}
  arrow(g,X(0),Y(0)+15,X(0),12,'#91bce6');label(g,45,17,'Forward');line(g,X(0),Y(0),X(30),Y(-25),'#647a91','4 4');line(g,X(30),Y(-25),X(0),Y(-50),'#647a91','4 4');
  g.append(svg('path',{d:'M '+X(0)+' '+Y(0)+' Q '+X(30)+' '+Y(-25)+' '+X(0)+' '+Y(-50),stroke:'#9ac9ff','stroke-width':2.6,fill:'none'}));
  for(let i=0;i<=10;i++){const q=steeringTarget(i/10);dot(g,X(q.x),Y(q.y),'#9ac9ff',2.6);}
  dot(g,X(30),Y(-25),'#e6b66e',4);label(g,X(30)+8,Y(-25),'P₁ control (30, −25)');label(g,X(0)+8,Y(0)+12,'P₀ start');label(g,X(0)+8,Y(-50)+12,'P₂ target');dot(g,X(p.x),Y(p.y),'#89d6a9',6);
  const approx=[];for(let i=0;i<=20;i++){const a=simulatedSteering(i/20);approx.push(X(a.x)+','+Y(a.y));}g.append(svg('polyline',{points:approx.join(' '),fill:'none',stroke:'#e6b66e','stroke-width':2,'stroke-dasharray':'4 3'}));const a=simulatedSteering(u);dot(g,X(a.x),Y(a.y),'#e6b66e',5);line(g,X(a.x),Y(a.y),X(p.x),Y(p.y),'#e6b66e','3 3');label(g,450,250,'Right → (studs)','end');metric(stats,'Right target',fmt(p.x)+' studs');metric(stats,'Forward target',fmt(p.y)+' studs');metric(stats,'Target speed','113.4 stud/s');
 }
 const play=playback(root,{duration:()=>.6,labelText:'Ability timeline progress',draw:f=>{const time=f*.6;progress.input.value=Math.max(0,Math.min(1,(time-.2)/.2));for(let i=0;i<timeline.children.length;i++)timeline.children[i].dataset.active=String(i===(time<.1?0:time<.2?1:time<.4?2:3));draw();}});progress.input.addEventListener('input',()=>{play.pause();draw();});root.append(el('p','Orange: illustrative steering-only integration at commanded speed, using sampled directions and no acceleration or collisions. It is not a replay or measured position; initial forward dash is separate from this coordinate origin. Playback follows nominal client timers.','am-caption'));draw();
}
function movementView(root,name){
 const g=diagram(name==='Dash'?'Lateral direction preview':'Forward dash target preview',480,125);
 const ox=240,oy=75;dot(g,ox,oy,'#edf4ff',5);arrow(g,ox,oy,ox,20,'#647a91');label(g,ox+10,22,'Facing');
 if(name==='Dash'){arrow(g,ox-10,oy,70,oy,'#9ac9ff');arrow(g,ox+10,oy,410,oy,'#9ac9ff');label(g,70,98,'Left','middle');label(g,410,98,'Right','middle');root.append(el('div','d = −RightVector if local movement X < 0; otherwise +RightVector','am-formula'),g,el('p','Direction only. Dash length and speed are not specified in the client module. Diagram is not to scale.','am-caption'));}
 else{g.replaceChildren();const x=90,y=90;dot(g,x,y,'#edf4ff',5);arrow(g,x,y,390,y,'#9ac9ff');dot(g,390,y,'#89d6a9',4);label(g,x,110,'Start','middle');label(g,390,110,'Target','middle');label(g,240,74,'60 studs forward','middle');root.append(el('div','Target = player position + 60 × forward direction\nDash time parameter = 0.5 s','am-formula'),g,el('p','Quadratic ease-out target. AlignPosition follows this target, so actual displacement can differ. Obstacles can shorten the target.','am-caption'),el('div','s(t) = 60[1 − (1 − t/0.5)²]','am-formula'));const marker=svg('circle',{cx:90,cy:90,r:7,fill:'#e6b66e'});g.append(marker);const play=playback(root,{duration:()=>.5,labelText:'Dash playback progress',draw:u=>marker.setAttribute('cx',90+5*dashTarget(60,.5,u*.5))});play.refresh();}
}
function genericMotion(root,m,index){
 const D=m.distance,T=m.duration;root.append(el('h4','Movement target '+(index+1)+' · '+m.direction,'am-title'),equation(row(v('s'),op('('),v('t'),op(')'),op('='),mn(D),op('['),mn(1),op('−'),sup(row(op('('),mn(1),op('−'),frac(v('t'),mn(T)),op(')')),mn(2)),op(']'))));
 const g=diagram('Quadratic ease-out target displacement',480,156),metrics=el('dl',null,'am-metrics');line(g,40,72,440,72,'#647a91','4 4');dot(g,40,72,'#edf4ff',5);dot(g,440,72,'#89d6a9',4);label(g,40,98,'Start','middle');label(g,440,98,fmt(D)+' studs','middle');label(g,240,32,'Target interpolation · '+fmt(T,3)+' s','middle');
 const path=Array.from({length:101},(_,i)=>{const u=i/100;return (40+400*u)+','+(145-30*dashTarget(D,T,u*T)/D);});g.append(svg('polyline',{points:path.join(' '),fill:'none',stroke:'#647a91','stroke-width':1.5}));
 const player=svg('circle',{cx:40,cy:72,r:7,fill:'#e6b66e'});g.append(player);root.append(g,metrics);
 const play=playback(root,{duration:()=>T,labelText:'Movement target '+(index+1)+' playback progress',draw:u=>{const t=u*T,d=dashTarget(D,T,t);player.setAttribute('cx',40+400*d/D);metrics.replaceChildren();metric(metrics,'Elapsed',fmt(t,3)+' s');metric(metrics,'Target displacement',fmt(d)+' studs');metric(metrics,'Target speed',fmt(2*D/T*(1-u))+' stud/s');}});play.refresh();
 root.append(el('p','This is the moving constraint target, not a measured character path. Selected direction and collisions can alter the result. Stages are shown separately because their execution order may be conditional.','am-caption'));
}
export function renderAbilityMath(name,spec=null){
 if(spec){const motion=spec.motion||[],shot=spec.shot;if(!shot&&!motion.length)return null;const section=el('details',null,'am-box');section.append(el('summary',shot&&motion.length?'3D shot & movement previews':shot?'3D shot simulation':'Movement target preview'),el('style',css));const body=el('div');section.append(body);let initialized=false;section.addEventListener('toggle',()=>{if(!section.open||initialized)return;initialized=true;motion.forEach((m,i)=>genericMotion(body,m,i));if(shot){if(shot.conditional)body.append(el('p','Model for the identified launch branch; other branches can use a different formula.','am-caption'));shotView(body,shot);}});return section;}
 if(!shots[name]&&!['Zero Reset Turn','Dash'].includes(name))return null;
 const section=el('details',null,'am-box');section.append(el('summary',name==='Zero Reset Turn'?'Mathematical steering path':name==='Dash'?'Movement direction diagram':'3D shot simulation'),el('style',css));
 const body=el('div');section.append(body);let initialized=false;
 function init(){if(initialized)return;initialized=true;if(name==='Zero Reset Turn')turnView(body);else if(name==='Dash')movementView(body,name);else{if(name==='Direct Heel Lift')movementView(body,name);shotView(body,shots[name]);}}
 section.addEventListener('toggle',()=>{if(section.open)init();});return section;
}
