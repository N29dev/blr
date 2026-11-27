import {decodeBatch} from './codec.mjs?v=1';
'use strict';
const $=id=>document.getElementById(id), canvas=$('field'),ctx=canvas.getContext('2d');
const endpoint='wss://blr-live-demo.scp343hey.workers.dev/demo/watch?format=binary-v1';
const HZ=60, BUFFER=.35, CAP=36006;
let socket=null,retry=null,backoff=500,session=null,active=false,frames=[],lastSeq=-1,gaps=0,following=true,playing=false,time=0,lastRender=0,lastArrival=0;
let wireBytes=0,wireStart=0,format='JSON';
function status(s){$('status').textContent=s}
function reset(id){session=id;frames=[];lastSeq=-1;gaps=0;following=true;playing=false;time=0;lastArrival=0;updateControls()}
function updateControls(){
 const first=frames[0]?.t??0,last=frames.at(-1)?.t??first;
 $('seek').min=first;$('seek').max=last;$('seek').disabled=!frames.length;
 $('pause').disabled=!frames.length;$('pause').textContent=following||playing?'Pause':'Play';
 $('live').disabled=!frames.length||following;
 $('received').textContent='Received: '+frames.length.toLocaleString()+' frames';
 $('gaps').textContent='Missing batches: '+gaps;
}
function validFrame(f){
 return f&&Number.isFinite(f.t)&&f.t>=0&&f.t<=600.1&&Array.isArray(f.players)&&f.players.length===16&&f.players.every(p=>p&&Number.isInteger(p.id)&&p.id>=1&&p.id<=16&&['Home','Away'].includes(p.team)&&Array.isArray(p.cf)&&p.cf.length>=3&&p.cf.slice(0,3).every(v=>Number.isFinite(v)&&Math.abs(v)<1000))&&Array.isArray(f.ball?.cf)&&f.ball.cf.slice(0,3).length===3&&f.ball.cf.slice(0,3).every(v=>Number.isFinite(v)&&Math.abs(v)<1000);
}
function message(event){
 let m;
 if(event.data instanceof ArrayBuffer){if(!session)return;try{m={type:'batch',id:session,...decodeBatch(event.data)};format='Binary delta v1';wireBytes+=event.data.byteLength}catch{return}}
 else {if(typeof event.data!=='string'||event.data.length>100000)return;try{m=JSON.parse(event.data)}catch{return}if(m?.type==='batch'){wireBytes+=new TextEncoder().encode(event.data).length;format='JSON'}}
 if(!m||typeof m!=='object')return;
 if(m.type==='hello'||m.type==='start'){
  if(m.id!==session)reset(m.id);
  active=m.active===true;if(m.type==='hello')format=m.format==='binary-v1'?'Binary delta v1':'JSON';
  if(Number.isInteger(m.viewers))$('viewers').textContent=m.viewers+' viewers';
  status(active?'LIVE · synthetic match':'Waiting for test publisher');
 }else if(m.type==='batch'){
  if(typeof m.id!=='string'||!Number.isInteger(m.seq)||m.seq<0||m.seq>=6000||!Array.isArray(m.frames)||m.frames.length!==6||!m.frames.every(validFrame))return;
  if(session!==m.id)reset(m.id);
  if(m.seq<=lastSeq)return;
  if(m.frames.some((f,i)=>Math.abs(f.t-(m.seq*6+i)/HZ)>1e-5))return;
  if(lastSeq>=0&&m.seq>lastSeq+1)gaps+=m.seq-lastSeq-1;
  lastSeq=m.seq;frames.push(...m.frames);if(frames.length>CAP)frames.splice(0,frames.length-CAP);
  lastArrival=performance.now();if(frames.length===6)time=frames[0].t;
  updateControls();
 }else if(m.type==='viewers'&&Number.isInteger(m.count))$('viewers').textContent=m.count+' viewers';
 else if(m.type==='end'&&m.id===session){active=false;status('Broadcast ended · replay available')}
}
function connect(){
 clearTimeout(retry);if(socket){socket.onclose=null;socket.close()}
 status('Connecting…');const ws=new WebSocket(endpoint);ws.binaryType='arraybuffer';socket=ws;wireStart=performance.now();wireBytes=0;
 ws.onopen=()=>{if(socket===ws){backoff=500;status('Connected · waiting for session')}};
 ws.onmessage=e=>{if(socket===ws)message(e)};
 ws.onclose=()=>{if(socket!==ws)return;active=false;status('Disconnected · reconnecting');retry=setTimeout(connect,backoff);backoff=Math.min(10000,backoff*2)};
 ws.onerror=()=>{if(socket===ws)status('Connection error')};
}
$('connect').onclick=connect;
$('pause').onclick=()=>{if(following||playing){following=false;playing=false}else{if(time>=frames.at(-1).t)time=frames[0].t;playing=true}updateControls()};
$('seek').oninput=()=>{following=false;playing=false;time=Number($('seek').value);updateControls()};
$('live').onclick=()=>{following=true;playing=false;time=Math.max(frames[0].t,frames.at(-1).t-BUFFER);updateControls()};
function bracket(t){let lo=0,hi=frames.length;while(lo<hi){let mid=(lo+hi)>>1;if(frames[mid].t<=t)lo=mid+1;else hi=mid}return [frames[Math.max(0,lo-1)],frames[Math.min(frames.length-1,lo)]]}
function draw(t){
 const w=canvas.width,h=canvas.height,pad=38,sx=x=>w/2+x*(w-2*pad)/360,sy=z=>h/2+z*(h-2*pad)/220;
 ctx.fillStyle='#234b34';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#28573a';for(let i=0;i<8;i+=2)ctx.fillRect(pad+i*(w-2*pad)/8,pad,(w-2*pad)/8,h-2*pad);
 ctx.strokeStyle='#c8e6d0';ctx.lineWidth=2;ctx.strokeRect(pad,pad,w-2*pad,h-2*pad);
 ctx.beginPath();ctx.moveTo(w/2,pad);ctx.lineTo(w/2,h-pad);ctx.stroke();ctx.beginPath();ctx.arc(w/2,h/2,64,0,Math.PI*2);ctx.stroke();
 ctx.strokeRect(pad,h/2-100,110,200);ctx.strokeRect(w-pad-110,h/2-100,110,200);
 if(!frames.length)return;
 const [a,b]=bracket(t),dt=b.t-a.t,u=dt>0&&dt<.1?Math.max(0,Math.min(1,(t-a.t)/dt)):0;
 const lerp=(v,z)=>v+(z-v)*u;
 const dot=(x,z,r,color)=>{ctx.beginPath();ctx.arc(sx(x),sy(z),r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#10141b';ctx.lineWidth=1.5;ctx.stroke()};
 for(const p of a.players){const q=b.players.find(v=>v.id===p.id)||p;const x=lerp(p.cf[0],q.cf[0]),z=lerp(p.cf[2],q.cf[2]);dot(x,z,9,p.team==='Home'?'#78b6ff':'#ff8389');ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(String(p.id),sx(x),sy(z)-14)}
 dot(lerp(a.ball.cf[0],b.ball.cf[0]),lerp(a.ball.cf[2],b.ball.cf[2]),6,'#fff');
 $('score').textContent=(a.scoreboard?.home??'–')+' : '+(a.scoreboard?.away??'–');
}
function loop(now){
 const dt=Math.min(.1,Math.max(0,(now-(lastRender||now))/1000));lastRender=now;
 if(frames.length){const first=frames[0].t,last=frames.at(-1).t;
  if(following){const target=active?Math.max(first,last-BUFFER):last;time=Math.min(target,Math.max(first,time)+dt*(target-time>.15?1.15:1))}
  else if(playing){time=Math.min(last,time+dt);if(time>=last){playing=false;updateControls()}}
  time=Math.max(first,Math.min(last,time));$('seek').value=time;
  const sec=Math.floor(time);$('clock').textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')+' / '+Math.floor(last/60)+':'+String(Math.floor(last)%60).padStart(2,'0');
  $('buffer').textContent='Buffer: '+Math.round((last-time)*1000)+' ms';
 }
 if(now-wireStart>=1000){const rate=wireBytes*1000/Math.max(1,now-wireStart);$('transport').textContent=format+' · '+(rate/1024).toFixed(1)+' KiB/s payload';wireStart=now;wireBytes=0}
 draw(time);requestAnimationFrame(loop);
}
window.addEventListener('pagehide',()=>{clearTimeout(retry);if(socket){socket.onclose=null;socket.close()}});
connect();requestAnimationFrame(loop);
