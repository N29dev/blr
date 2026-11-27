/* Offline Flow reconstruction. Never infer activation from movement or cooldowns. */
const ReplayFlow=(()=>{
 const name=v=>typeof v==='string'&&v.trim()&&v.length<=128?v.trim():null;
 const bar=v=>Number.isFinite(v)&&v>=0&&v<=100?v:null;
 const flag=v=>typeof v==='boolean'?v:null;
 function build(frames,localId,roster={}){
  const history=new Map(),last=new Map();let present=new Set(),local={name:null,active:null,bar:null};
  function add(id,t,state){
   const prior=last.get(id);
   if(prior&&prior.name===state.name&&prior.active===state.active&&prior.bar===state.bar&&prior.session===state.session)return;
   last.set(id,state);if(!history.has(id))history.set(id,[]);history.get(id).push({t,...state});
  }
  for(const f of frames){
   const ls=f.localStats;
   if(ls){if(Object.hasOwn(ls,'Flow'))local.name=name(ls.Flow);if(Object.hasOwn(ls,'InFlow'))local.active=flag(ls.InFlow);if(Object.hasOwn(ls,'FlowBar'))local.bar=bar(ls.FlowBar)}
   const next=new Set();
   for(const p of f.players||[]){
    const id=String(p.id);if(p.kind==='npc'||roster[id]?.kind==='npc')continue;next.add(id);
    const session=String(p.replaySessionId??p.id),prev=last.get(id),fresh=prev?.session!==session||!present.has(id);
    let state=fresh?{name:null,active:null,bar:null,session}:{...prev};
    if(p.flowObserved===true){state={name:name(p.flow),active:flag(p.inFlow),bar:bar(p.flowBar),session}}
    else{
     if(Object.hasOwn(p,'flow'))state.name=name(p.flow);
     if(Object.hasOwn(p,'inFlow'))state.active=flag(p.inFlow);
     if(Object.hasOwn(p,'flowBar'))state.bar=bar(p.flowBar);
     // Legacy local stats describe the recording player only.
     if(localId!=null&&id===String(localId)){if(state.name===null)state.name=local.name;if(state.active===null)state.active=local.active;if(state.bar===null)state.bar=local.bar}
    }
    add(id,f.t,state);
   }
   for(const id of present)if(!next.has(id))add(id,f.t,{name:null,active:null,bar:null,session:null});
   present=next;
  }
  return history;
 }
 function at(history,id,t){const list=history.get(String(id));if(!list)return null;let l=0,h=list.length;while(l<h){const m=(l+h)>>1;if(list[m].t<=t)l=m+1;else h=m}return list[l-1]||null}
 function label(state){if(!state)return '';const parts=[];if(state.name)parts.push(state.name);if(state.active===true)parts.push('ACTIVE');else if(state.active===false)parts.push('Inactive');if(state.bar!==null&&state.bar!==undefined)parts.push(Math.round(state.bar)+'%');return parts.length?'Flow: '+parts.join(' · '):''}
 return {build,at,label};
})();