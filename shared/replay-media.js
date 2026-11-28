// Offline replay helpers. No Roblox, network or asset access.
(function(){
"use strict";
function buildCueTimeline(goals,events){
 const rows=[];
 for(const g of goals||[])if(Number.isFinite(g?.t)&&g.kind==="goal")rows.push({t:g.t,type:"goal",actor:null});
 for(const e of events||[])if(Number.isFinite(e?.t)&&e.source==="counter"&&["ankle_break","save","steal"].includes(e.type))rows.push({t:e.t,type:e.type,actor:e.id??null});
 rows.sort((a,b)=>a.t-b.t);
 const last=new Map();
 return rows.filter(e=>{const key=e.type+":"+e.actor;const t=last.get(key);if(t!==undefined&&e.t-t<.12)return false;last.set(key,e.t);return true});
}

function cuesBetween(rows,from,to){
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>2)return [];
 let l=0,h=rows.length;while(l<h){const m=(l+h)>>1;if(rows[m].t<=from)l=m+1;else h=m;}
 const out=[];for(let i=l;i<rows.length&&rows[i].t<=to;i++){if(out.length>=4)break;out.push(rows[i]);}return out;
}

function validatePack(p){
 if(p?.schema!==1||!Number.isInteger(p.snapshotVersion)||!Array.isArray(p.styles)||!Array.isArray(p.abilities)||!Array.isArray(p.signatures)||!p.media||typeof p.media!=="object"||Array.isArray(p.media)||p.styles.length>300||p.abilities.length>5000||p.signatures.length>5000||Object.keys(p.media).length>20000)throw Error("Unsupported technical pack");
 const abilities=new Map(),styles=new Map(),signals=new Map();
 for(const a of p.abilities){if(typeof a?.id!=="string"||typeof a.name!=="string"||abilities.has(a.id))throw Error("Invalid ability ID");abilities.set(a.id,a);}
 for(const s of p.styles){if(typeof s?.id!=="string"||typeof s.name!=="string"||styles.has(s.id))throw Error("Invalid style ID");styles.set(s.id,s);}
 for(const e of p.signatures){if(typeof e?.id!=="string"||!Array.isArray(e.rules)||e.rules.length>100)throw Error("Invalid signature");for(const r of e.rules){
   const groups=r.match==="any_of"&&Array.isArray(r.signal_ids)?[r.signal_ids]:r.match==="all_of"?(Array.isArray(r.clauses)?r.clauses.map(c=>c.any_of):Array.isArray(r.signal_ids)?r.signal_ids.map(s=>[s]):[]):[];
   if(!groups.length||groups.some(g=>!Array.isArray(g)||!g.length||g.some(s=>typeof s!=="string"||s.length>300)))continue;
   const rule={id:e.id,kind:e.kind,confidence:["low","medium","high"].includes(r.confidence)?r.confidence:"low",groups,combined:r.match==="all_of"};
   for(const id of new Set(groups.flat())){if(!signals.has(id))signals.set(id,[]);signals.get(id).push(rule);}
 }}
 return {snapshotVersion:p.snapshotVersion,abilities,styles,signals,media:p.media};
}

function matchObservation(index,observation){
 const ids=Array.isArray(observation?.signals)?observation.signals.slice(0,32):[observation?.signalId];
 const seen=new Set(ids.filter(s=>typeof s==="string"&&s.length<=300));
 const rules=new Set();for(const id of seen)for(const r of index.signals.get(id)||[])rules.add(r);
 const rank={low:1,medium:2,high:3},best=new Map();
 for(const r of rules){if(r.combined&&(observation.actor===undefined||observation.actor===null))continue;
 if(!r.groups.every(g=>g.some(s=>seen.has(s))))continue;
 const prev=best.get(r.id);if(!prev||rank[r.confidence]>rank[prev.confidence])best.set(r.id,{id:r.id,kind:r.kind,confidence:r.confidence,confirmed:false});}
 return [...best.values()].sort((a,b)=>rank[b.confidence]-rank[a.confidence]||a.id.localeCompare(b.id));
}
 globalThis.BLRReplayMedia=Object.freeze({buildCueTimeline,cuesBetween,validatePack,matchObservation});
})();
