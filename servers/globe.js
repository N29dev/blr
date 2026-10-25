/**
 * Glutony interactive globe. Country outlines: /servers/world.geojson
 * See world-data-license.txt for MIT attribution.
 * Pins show approximate city positions for RoValra-resolved live listings, not Roblox datacenter IPs.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const sources=['https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js','https://unpkg.com/d3@7.9.0/dist/d3.min.js'];
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const alias={'united states':'usa','united states of america':'usa',usa:'usa',us:'usa',uk:'england','united kingdom':'england','great britain':'england','korea republic of':'south korea','russian federation':'russia',uae:'united arab emirates',czechia:'czech republic','czech republic':'czech republic','hong kong':'china','hong kong sar':'china',turkiye:'turkey',bahamas:'the bahamas','tanzania':'united republic of tanzania'};
const norm=value=>alias[normalized(value)]||normalized(value);

/* Reference city centers, NOT independently verified Roblox datacenters.
 * Only locations actually reported by RoValra for a sampled server become
 * active markers; this atlas is just for plotting observed city labels. */
const CITY_COORDS={
 'ashburn':[-77.4875,39.0438],'atlanta':[-84.388,33.749],
 'chicago':[-87.6298,41.8781],'dallas':[-96.797,32.7767],
 'houston':[-95.3698,29.7604],'los angeles':[-118.2437,34.0522],
 'san jose':[-121.8863,37.3382],'san francisco':[-122.4194,37.7749],
 'seattle':[-122.3321,47.6062],'miami':[-80.1918,25.7617],
 'new york':[-74.006,40.7128],'new york city':[-74.006,40.7128],
 'newark':[-74.1724,40.7357],'secaucus':[-74.0553,40.7895],
 'virginia':[-78.6569,37.4316],'california':[-119.4179,36.7783],
 'illinois':[-89.3985,40.6331],'texas':[-99.9018,31.9686],
 'florida':[-81.5158,27.6648],'washington':[-120.7401,47.7511],
 'phoenix':[-112.074,33.4484],'denver':[-104.9903,39.7392],
 'boston':[-71.0589,42.3601],'montreal':[-73.5673,45.5017],
 'toronto':[-79.3832,43.6532],'vancouver':[-123.1207,49.2827],
 'quebec':[-71.208,46.8139],
 'sao paulo':[-46.6333,-23.5505],'rio de janeiro':[-43.2096,-22.9068],
 'buenos aires':[-58.3816,-34.6037],'santiago':[-70.6693,-33.4489],
 'bogota':[-74.0721,4.711],'lima':[-77.0428,-12.0464],
 'montevideo':[-56.1645,-34.9011],'cordoba':[-64.1888,-31.4201],
 'frankfurt':[8.6821,50.1109],'paris':[2.3522,48.8566],
 'amsterdam':[4.9041,52.3676],'london':[-0.1276,51.5072],
 'warsaw':[21.0122,52.2297],'stockholm':[18.0686,59.3293],
 'madrid':[-3.7038,40.4168],'dublin':[-6.2603,53.3498],
 'milan':[9.19,45.4642],'rome':[12.4964,41.9028],
 'zurich':[8.5417,47.3769],'vienna':[16.3738,48.2082],
 'helsinki':[24.9384,60.1699],'bucharest':[26.1025,44.4268],
 'berlin':[13.405,52.52],'prague':[14.4378,50.0755],
 'tokyo':[139.6917,35.6895],'osaka':[135.5023,34.6937],
 'singapore':[103.8198,1.3521],'mumbai':[72.8777,19.076],
 'chennai':[80.2707,13.0827],'new delhi':[77.209,28.6139],
 'hong kong':[114.1694,22.3193],'seoul':[126.978,37.5665],
 'busan':[129.0756,35.1796],'jakarta':[106.8456,-6.2088],
 'bangkok':[100.5018,13.7563],'kuala lumpur':[101.6869,3.139],
 'manila':[120.9842,14.5995],'taipei':[121.5654,25.033],
 'dubai':[55.2708,25.2048],'abu dhabi':[54.3773,24.4539],
 'istanbul':[28.9784,41.0082],'tel aviv':[34.7818,32.0853],
 'sydney':[151.2093,-33.8688],'melbourne':[144.9631,-37.8136],
 'auckland':[174.7633,-36.8485],'perth':[115.8605,-31.9505],
 'johannesburg':[28.0473,-26.2041],'cape town':[18.4241,-33.9249]
};
const AREA_ORDER=['NA','SA','Brazil','Europe','Asia','Oceania','Africa & Middle East','Other'];
const AREA_LABEL={NA:'North America',SA:'South America',Brazil:'Brazil',Europe:'Europe',Asia:'Asia',Oceania:'Oceania','Africa & Middle East':'Africa & Middle East',Other:'Other / unresolved'};
const NA=new Set('US CA MX GT BZ SV HN NI CR PA CU HT DO JM BS PR TT BB GD LC VC AG KN DM AW CW BQ SX BM GL'.split(' '));
const SA=new Set('AR CL CO PE UY PY BO EC VE GY SR GF FK'.split(' '));
const EU=new Set('GB IE FR DE NL BE LU CH AT IT ES PT PL CZ SK HU RO BG GR DK SE NO FI IS EE LV LT SI HR BA RS ME MK AL XK MT CY UA BY MD RU TR GE AM AZ'.split(' '));
const AS=new Set('JP KR KP CN HK MO TW SG IN MY ID TH VN PH KH LA MM BD PK NP LK MN KZ UZ KG TJ TM AF'.split(' '));
const OC=new Set('AU NZ FJ PG NC GU MP PF WS TO VU SB'.split(' '));
const COUNTRY_NAMES={
 NA:'united states|united states of america|usa|canada|mexico|guatemala|belize|costa rica|panama|nicaragua|honduras|el salvador|cuba|jamaica|dominican republic|puerto rico|bahamas|bermuda|haiti|trinidad and tobago',
 SA:'argentina|chile|colombia|peru|uruguay|paraguay|bolivia|ecuador|venezuela|guyana|suriname|french guiana',
 Europe:'united kingdom|great britain|england|ireland|france|germany|netherlands|belgium|luxembourg|switzerland|austria|italy|spain|portugal|poland|czechia|czech republic|slovakia|hungary|romania|bulgaria|greece|denmark|sweden|norway|finland|iceland|estonia|latvia|lithuania|slovenia|croatia|serbia|bosnia and herzegovina|albania|ukraine|russia|turkey|belarus|georgia|armenia|azerbaijan',
 Asia:'japan|south korea|north korea|china|hong kong|macau|taiwan|singapore|india|malaysia|indonesia|thailand|vietnam|philippines|cambodia|laos|myanmar|bangladesh|pakistan|nepal|sri lanka|mongolia|kazakhstan|uzbekistan',
 Oceania:'australia|new zealand|fiji|papua new guinea|new caledonia'
};
const COUNTRY_NAME_SETS=Object.fromEntries(Object.entries(COUNTRY_NAMES).map(([key,names])=>[key,new Set(names.split('|'))]));
function continent(code,name){
 const n=normalized(name);
 if(code==='BR'||n==='brazil'||n==='brasil')return 'Brazil';
 if(NA.has(code)||COUNTRY_NAME_SETS.NA.has(n))return 'NA';
 if(SA.has(code)||COUNTRY_NAME_SETS.SA.has(n))return 'SA';
 if(EU.has(code)||COUNTRY_NAME_SETS.Europe.has(n))return 'Europe';
 if(AS.has(code)||COUNTRY_NAME_SETS.Asia.has(n))return 'Asia';
 if(OC.has(code)||COUNTRY_NAME_SETS.Oceania.has(n))return 'Oceania';
 if(code||n)return 'Africa & Middle East';
 return 'Other';
}
function canonicalCity(server){
 const raw=String(server?.city||'').trim();
 // When RoValra reports no city, only use state-level or country-level
 // approximate markers. Never claim a physical datacenter in that location.
 const fallback=String(server?.state||'').trim();
 return raw||fallback||'';
}
function coordForName(raw){
 // Use raw normalized city: country aliases (e.g. Hong Kong→China) must not
 // rewrite city names when locating the actual city-center marker.
 const clean=normalized(raw);
 return CITY_COORDS[clean]||CITY_COORDS[clean.replace(/\b(city|metro|county)\b/g,'').trim()]||null;
}

const state={open:false,loaded:false,loading:null,countries:[],lookup:new Map(),groups:[],servers:[],select:null,projection:null,shapes:null,rotation:[-14,-19],scale:263,drag:null,suppress:false,raf:0};
const element=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const svgElement=(tag,attributes={},label)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attributes))n.setAttribute(k,v);if(label!==undefined)n.textContent=label;return n;};
const setStatus=message=>{$('globe-status').textContent=message;};
function grouping(servers){
 const regions=new Map();
 for(const server of servers){
  const code=/^[A-Z]{2}$/.test(server.countryCode||'')?server.countryCode:null;
  const country=String(server.country||'').trim();
  const city=canonicalCity(server);
  if(!code&&!country&&!city)continue;
  const area=continent(code,country);
  const title=city||(country||code||'Region unknown');
  const key=area+'|'+(code||norm(country))+'|'+norm(title);
  let region=regions.get(key);
  if(!region){
   region={key,area,code,country,city,label:title,count:0,ids:[],coords:coordForName(title),accuracy:coordForName(title)?'city':'country'};
   regions.set(key,region);
  }
  region.count++;region.ids.push(server.id);
 }
 return [...regions.values()].sort((a,b)=>AREA_ORDER.indexOf(a.area)-AREA_ORDER.indexOf(b.area)||b.count-a.count||a.label.localeCompare(b.label));
}
function choose(group){
 if(typeof state.select==='function')state.select({serverIds:group.ids.slice(),countryCode:group.code,country:group.country,city:group.city,label:group.label,area:group.area,key:group.key});
 close();
}
function countryList(){
 const list=$('globe-regions');list.replaceChildren();
 const resolved=state.groups.reduce((sum,g)=>sum+g.count,0);
 $('globe-resolved').textContent=state.groups.length+' distinct resolved locations · '+resolved+'/'+state.servers.length+' scanned servers';
 if(!state.groups.length){
  list.append(element('div','globe-empty','No resolved regions yet. Refresh later to try another RoValra lookup.'));
  return;
 }
 for(const area of AREA_ORDER){
  const all=state.groups.filter(g=>g.area===area);
  if(!all.length)continue;
  const total=all.reduce((sum,g)=>sum+g.count,0);
  const section=element('details','globe-area');
  section.open=true;
  const head=element('summary','globe-area-title');
  head.append(element('span','',AREA_LABEL[area]),element('span','globe-region-count',total+' servers'));
  section.append(head);
  const groupRow=element('button','globe-region globe-area-all');
  groupRow.type='button';
  groupRow.append(element('span','globe-region-name','All '+AREA_LABEL[area]),element('span','globe-region-count',all.length+' locations'));
  groupRow.addEventListener('click',()=>{
   choose({ids:all.flatMap(g=>g.ids),code:null,country:null,city:null,label:AREA_LABEL[area],area,key:area});
  });
  section.append(groupRow);
  for(const g of all){
   const btn=element('button','globe-region');
   btn.type='button';
   const display=g.country&&g.city?g.label+' · '+g.country:g.label;
   const text=element('span','globe-region-name',display);
   btn.append(text,element('span','globe-region-count',g.count+' server'+(g.count===1?'':'s')));
   btn.title='Show '+display+' servers in this sample';
   btn.addEventListener('click',()=>choose(g));
   section.append(btn);
  }
  list.append(section);
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
 // City-level reference coordinates are approximate and NOT a verified
 // Roblox datacenter/IP. Fallback to country polygon centroid when city
 // geocoding is unavailable, marking its accuracy accordingly.
 if(group.coords)return group.coords;
 const micro={SG:[103.8198,1.3521],HK:[114.17,22.32],MO:[113.55,22.19]};
 if(group.code&&micro[group.code])return micro[group.code];
 const candidates=[group.country];
 if(group.code){try{candidates.push(new Intl.DisplayNames(['en'],{type:'region'}).of(group.code));}catch{}}
 for(const name of candidates){
  const feature=state.lookup.get(norm(name));
  if(feature){
   const geo=window.d3.geoCentroid(feature);
   if(geo.every(Number.isFinite))return geo;
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
  const radius=Math.min(12,4+Math.sqrt(group.count)*1.5);
  const dot=svgElement('circle',{cx:point[0].toFixed(2),cy:point[1].toFixed(2),r:radius.toFixed(1),class:'globe-dot','data-globe-key':group.key,tabindex:'0',role:'button','aria-label':group.label+': '+group.count+' servers'});
  dot.append(svgElement('title',{},group.label+' · '+(group.country||'')+' · '+group.count+' servers (approximate '+group.accuracy+' position)'));
  s.points.append(dot);
 }
 $('globe-hint').textContent=mapped+' of '+state.groups.length+' identified locations mapped · Drag to rotate · Scroll to zoom · Select dots to filter';
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
  setStatus('Select a region or an entire continent to filter the sampled servers.');
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