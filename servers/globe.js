/**
 * Glutony interactive globe. Country outlines: /servers/world.geojson
 * See world-data-license.txt for MIT attribution.
 * Pins show approximate COUNTRY CENTROIDS, not precise Roblox datacenter sites.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const sources=['https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js','https://unpkg.com/d3@7.9.0/dist/d3.min.js'];
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const alias={'united states':'united states of america',usa:'united states of america',us:'united states of america',uk:'united kingdom','great britain':'united kingdom','korea republic of':'south korea','russian federation':'russia',uae:'united arab emirates','czech republic':'czechia','hong kong':'china','hong kong sar':'china',turkiye:'turkey'};
const norm=value=>alias[normalized(value)]||normalized(value);
const state={open:false,loaded:false,loading:null,countries:[],lookup:new Map(),groups:[],servers:[],select:null,projection:null,shapes:null,rotation:[-14,-19],scale:263,drag:null,suppress:false,raf:0};
const element=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const svgElement=(tag,attributes={},label)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attributes))n.setAttribute(k,v);if(label!==undefined)n.textContent=label;return n;};
const setStatus=message=>{$('globe-status').textContent=message;};
function grouping(servers){
 const groups=new Map();
 for(const server of servers){
  const code=/^[A-Z]{2}$/.test(server.countryCode||'')?server.countryCode:null;
  const name=String(server.country||'').trim();
  if(!code&&!name)continue;
  let display=name||code;
  if(!name&&code){try{display=new Intl.DisplayNames(['en'],{type:'region'}).of(code)||code;}catch{}}
  const key=code||norm(display);
  if(!groups.has(key))groups.set(key,{key,code,country:display,count:0});
  groups.get(key).count++;
 }
 return [...groups.values()].sort((a,b)=>b.count-a.count||a.country.localeCompare(b.country));
}
function choose(group){
 if(typeof state.select==='function')state.select({countryCode:group.code,country:group.country,key:group.key});
 close();
}
function countryList(){
 const list=$('globe-regions');list.replaceChildren();
 const recognized=state.groups.reduce((sum,group)=>sum+group.count,0);
 $('globe-resolved').textContent=recognized+' / '+state.servers.length+' servers with known countries';
 if(!state.groups.length){
  list.append(element('div','globe-empty','No resolved regions yet. Try refreshing the servers later.'));
  return;
 }
 for(const g of state.groups){
  const btn=element('button','globe-region');
  btn.type='button';
  btn.append(element('span','globe-region-name',g.country),
             element('span','globe-region-count',g.count+' server'+(g.count===1?'':'s')));
  btn.title='Filter servers to '+g.country;
  btn.addEventListener('click',()=>choose(g));
  list.append(btn);
 }
}
function loadScript(url){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=url;script.async=true;
  script.onload=()=>window.d3?.geoOrthographic?resolve():reject(Error('Globe engine did not initialize'));
  script.onerror=()=>{script.remove();reject(Error('Globe engine could not load'));};
  document.head.append(script);
 });
}
async function prepare(){
 if(state.loaded)return;
 if(!state.loading)state.loading=(async()=>{
  if(!window.d3?.geoOrthographic){
   let loaded=false;
   for(const url of sources){try{await loadScript(url);loaded=true;break;}catch{}}
   if(!loaded)throw Error('Could not load globe scripts. Check your blocker or try another browser.');
  }
  const response=await fetch('/servers/world.geojson',{cache:'force-cache'});
  if(!response.ok)throw Error('Country outlines are unavailable.');
  const geo=await response.json();
  if(geo.type!=='FeatureCollection'||!Array.isArray(geo.features))throw Error('Invalid map data.');
  state.countries=geo.features.filter(f=>f?.geometry&&f?.properties?.name);
  state.lookup=new Map(state.countries.map(f=>[norm(f.properties.name),f]));
  state.projection=window.d3.geoOrthographic().scale(state.scale).translate([310,310]).rotate(state.rotation).clipAngle(90).precision(.5);
  state.loaded=true;
 })().catch(e=>{state.loading=null;throw e;});
 return state.loading;
}
function locate(group){
 const candidates=[group.country];
 if(group.code){try{candidates.push(new Intl.DisplayNames(['en'],{type:'region'}).of(group.code));}catch{}}
 for(const name of candidates){
  const feature=state.lookup.get(norm(name));
  if(feature){
   const coords=window.d3.geoCentroid(feature);
   if(coords.every(Number.isFinite))return coords;
  }
 }
 return null;
}
function setupShapes(){
 const d3=window.d3,svg=$('globe-svg');svg.replaceChildren();
 const sphere=svgElement('path',{class:'globe-sphere'});
 const grid=svgElement('path',{class:'globe-graticule'});
 const land=svgElement('g',{class:'globe-land'});
 const countries=state.countries.map(f=>{
  const path=svgElement('path',{class:'globe-country'});land.append(path);
  return {feature:f,element:path};
 });
 const points=svgElement('g',{class:'globe-points'});
 svg.append(sphere,grid,land,points);
 state.shapes={sphere,grid,land,countries,points,gridData:d3.geoGraticule().step([25,25])()};
 redraw();
}
function redraw(){
 if(state.raf)return;
 state.raf=requestAnimationFrame(draw);
}
function draw(){
 state.raf=0;
 if(!state.open||!state.loaded||!state.shapes)return;
 const d3=window.d3,p=state.projection.rotate(state.rotation).scale(state.scale);
 const path=d3.geoPath(p),s=state.shapes;
 s.sphere.setAttribute('d',path({type:'Sphere'}));
 s.grid.setAttribute('d',path(s.gridData));
 for(const item of s.countries)item.element.setAttribute('d',path(item.feature)||'');
 s.points.replaceChildren();
 const horizon=p.invert([310,310]);
 let mapped=0;
 for(const group of state.groups){
  const geo=locate(group);
  if(!geo)continue;
  mapped++;
  if(d3.geoDistance(geo,horizon)>Math.PI/2-.025)continue;
  const point=p(geo);
  if(!point||!point.every(Number.isFinite))continue;
  const radius=Math.min(15,6+Math.sqrt(group.count)*1.5);
  const dot=svgElement('circle',{cx:point[0].toFixed(2),cy:point[1].toFixed(2),r:radius.toFixed(1),class:'globe-dot','data-globe-key':group.key,tabindex:'0',role:'button','aria-label':group.country+': '+group.count+' servers'});
  dot.append(svgElement('title',{},group.country+' · '+group.count+' servers (approximate country location)'));
  s.points.append(dot);
 }
 $('globe-hint').textContent=mapped+' of '+state.groups.length+' countries mapped · Drag to rotate · Scroll to zoom · Select dots to filter';
}
function onDown(e){
 if(!state.loaded||e.button!==0)return;
 state.drag={id:e.pointerId,x:e.clientX,y:e.clientY,rotation:state.rotation.slice(),moved:false};
 $('globe-svg').setPointerCapture(e.pointerId);
}
function onMove(e){
 const d=state.drag;
 if(!d||e.pointerId!==d.id)return;
 const factor=620/Math.max(200,$('globe-svg').getBoundingClientRect().width);
 const dx=(e.clientX-d.x)*factor,dy=(e.clientY-d.y)*factor;
 if(Math.hypot(dx,dy)>4)d.moved=true;
 state.rotation=[d.rotation[0]+dx*.34,Math.max(-88,Math.min(88,d.rotation[1]-dy*.34))];
 redraw();
}
function onUp(e){
 if(state.drag?.id!==e.pointerId)return;
 if(state.drag.moved){state.suppress=true;setTimeout(()=>state.suppress=false,30);}
 state.drag=null;
}
function onClick(e){
 if(state.suppress)return;
 const dot=e.target.closest?.('[data-globe-key]');
 if(!dot)return;
 const g=state.groups.find(x=>x.key===dot.getAttribute('data-globe-key'));
 if(g)choose(g);
}
async function open(servers,filter){
 state.open=true;
 state.select=filter;
 state.servers=Array.isArray(servers)?servers:[];
 state.groups=grouping(state.servers);
 countryList();
 $('globe-loading').hidden=false;
 setStatus('Preparing the interactive globe…');
 if(!$('globe-dialog').open)$('globe-dialog').showModal();
 try {
  await prepare();
  if(!state.open)return;
  state.groups=grouping(state.servers);countryList();
  setupShapes();$('globe-loading').hidden=true;
  setStatus('Select a country to filter the server list.');
 }catch(error){
  setStatus(error.message+' You can still use the country list.');
 }
}
function refresh(servers){
 state.servers=Array.isArray(servers)?servers:[];
 state.groups=grouping(state.servers);
 if(state.open){countryList();if(state.loaded)redraw();}
}
function close(){
 state.open=false;
 state.drag=null;
 if(state.raf){cancelAnimationFrame(state.raf);state.raf=0;}
 if($('globe-dialog')?.open)$('globe-dialog').close();
}
function init(){
 const svg=$('globe-svg');if(!svg||!$('globe-dialog'))return;
 svg.addEventListener('pointerdown',onDown);
 svg.addEventListener('pointermove',onMove);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(name,onUp);
 svg.addEventListener('click',onClick);
 svg.addEventListener('wheel',e=>{
  if(!state.open||!state.loaded)return;
  e.preventDefault();state.scale=Math.max(175,Math.min(325,state.scale*(e.deltaY>0?.92:1.08)));redraw();
 },{passive:false});
 svg.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.hasAttribute('data-globe-key')){
   e.preventDefault();onClick({target:e.target});return;
  }
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   e.preventDefault();
   state.rotation[0]+=e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0;
   state.rotation[1]=Math.max(-88,Math.min(88,state.rotation[1]+(e.key==='ArrowUp'?12:e.key==='ArrowDown'?-12:0)));
   redraw();
  }
 });
 $('globe-close').addEventListener('click',close);
 $('globe-reset').addEventListener('click',()=>{state.rotation=[-14,-19];state.scale=263;redraw();});
 $('globe-dialog').addEventListener('close',()=>{state.open=false;if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;});
}
window.GlutonyGlobe={open,refresh,close};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();