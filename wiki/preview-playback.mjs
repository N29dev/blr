// Shared, opt-in animation clock for wiki previews. No game data or network access.
let active=null;
export function bindPreviewPlayback({host,play,reset,speed,loop,duration,read,render}){
 let raf=null,last=null,running=false;
 const visible=()=>host.isConnected&&!document.hidden&&!host.closest('details:not([open])')&&!host.closest('[hidden]');
 const limit=()=>Math.max(0,Number(duration())||0);
 function pause(){
  running=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;last=null;
  if(active===pause)active=null;
  play.textContent='▶ Play';play.setAttribute('aria-pressed','false');
 }
 function tick(now){
  raf=null;if(!running||!visible()){pause();return;}
  const max=limit();if(!max){pause();return;}
  const elapsed=last===null?0:Math.max(0,now-last)/1000;last=now;
  let t=Math.max(0,Number(read())||0)+elapsed*Number(speed.value||1);
  if(t>=max){
   if(loop.checked)t%=max;else{render(max);pause();return;}
  }
  render(t);raf=requestAnimationFrame(tick);
 }
 play.addEventListener('click',()=>{
  if(running){pause();return;}if(!visible()||!limit())return;
  if(active)active();active=pause;
  if(Number(read())>=limit()-.001)render(0);
  running=true;last=null;play.textContent='Ⅱ Pause';play.setAttribute('aria-pressed','true');raf=requestAnimationFrame(tick);
 });
 reset.addEventListener('click',()=>{pause();render(0);});
 play.setAttribute('aria-pressed','false');
 return {pause};
}
export function previewControls(){
 const make=(tag,label)=>{const n=document.createElement(tag);if(label)n.textContent=label;return n;};
 const bar=make('div'),play=make('button','▶ Play'),reset=make('button','Restart'),speed=make('select'),loop=make('input'),label=make('label');
 bar.className='preview-playback';bar.style.cssText='display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0';
 play.type=reset.type='button';play.setAttribute('aria-label','Play or pause preview');reset.setAttribute('aria-label','Restart preview');
 speed.setAttribute('aria-label','Playback speed');
 for(const n of [.5,1,2]){const o=make('option',n+'×');o.value=n;speed.append(o);}speed.value='1';
 for(const n of [play,reset,speed])n.style.cssText='background:#23384c;color:#e5f1ff;border:1px solid #41617c;border-radius:6px;padding:7px 10px;font:inherit;cursor:pointer';
 loop.type='checkbox';label.style.cssText='display:inline-flex;align-items:center;gap:5px;cursor:pointer';label.append(loop,make('span','Loop'));
 bar.append(play,reset,speed,label);
 return {bar,play,reset,speed,loop};
}
