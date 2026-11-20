export const WIKI_API='https://glutony.scp343hey.workers.dev/api/wiki';
export const FIELDS=[
 ['name','Ability name','text',120],['kit','Kit / variant','text',80],['input','Input / key','text',80],
 ['cooldown','Cooldown (s)','number'],['playerIframes','Player i-frames (s)','number'],['ballIframes','Ball i-frames (s)','number'],
 ['duration','Ability duration (s)','number'],['range','Range (studs)','number'],['chargeTime','Charge time (s)','number'],
 ['testedOn','Last tested (UTC date)','date'],['condition','Activation conditions','textarea',600],['effect','Effects and interactions','textarea',1500],['notes','Testing notes / variable values','textarea',1500],['evidence','Evidence HTTPS URL','url',500]
];
export const today=()=>new Date().toISOString().slice(0,10);
export function needsRetest(entry,history){return history.some(p=>p.date>entry.testedOn&&['Balance','Patch','Hotfix','Rework','Release'].includes(p.type));}
export async function wikiRequest(path,{key='',method='GET',body}={}){
 const headers={};if(key)headers.authorization='Bearer '+key;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(WIKI_API+path,{method,headers,cache:'no-store',...(body!==undefined?{body:JSON.stringify(body)}:{})});
 let value;try{value=await r.json();}catch{throw Error('Wiki API not available (HTTP '+r.status+')');}
 if(!r.ok)throw Error(value.error||'Request failed (HTTP '+r.status+')');return value;
}
