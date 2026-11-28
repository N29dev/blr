// Optional local-only research pack and original synthesized event cues.
(function(){
"use strict";
const core=globalThis.BLRReplayMedia;
let context=null, enabled=false, timeline=[], pack=null, observations=[];
const $=id=>document.getElementById(id);
function tone(e){
 if(!context||context.state!=="running")return;
 const specs={goal:[660,880],ankle_break:[180,110],save:[520,700],steal:[310]};
 const notes=specs[e.type]||[];
 notes.forEach((hz,i)=>{const start=context.currentTime+i*.08,osc=context.createOscillator(),gain=context.createGain();osc.type="sine";osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.065,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+.075);osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.08);osc.onended=()=>{osc.disconnect();gain.disconnect();};});
}
function setTimeline(goals,events){timeline=core.buildCueTimeline(goals,events);}
function advance(from,to,offline){if(enabled&&offline)for(const e of core.cuesBetween(timeline,from,to))tone(e);}
function text(tag,value){const e=document.createElement(tag);e.textContent=String(value??"");return e;}
function renderAbilities(){
 const list=$("mediaAbilityResults");list.replaceChildren();if(!pack)return;
 const q=$("mediaAbilityQuery").value.trim().toLowerCase();if(!q){list.append(text("p","Search a style or ability name."));return;}
 const styleIds=new Set([...pack.styles.values()].filter(s=>s.name.toLowerCase().includes(q)).flatMap(s=>Object.values(s.kit_ability_ids||{}).flat()));
 const matches=[...pack.abilities.values()].filter(a=>a.name.toLowerCase().includes(q)||a.id.toLowerCase().includes(q)||styleIds.has(a.id));
 for(const a of matches.slice(0,40)){const d=document.createElement("details");d.append(text("summary",a.name+" · "+a.id),text("p",a.description),text("p","Activation: "+(a.activation||"Unknown")),text("p","Client cooldown candidates: "+(Array.isArray(a.cooldowns)&&a.cooldowns.length?a.cooldowns.join(" / ")+" s":"Unknown")));const ol=document.createElement("ol");for(const s of (Array.isArray(a.stages)?a.stages:[]).slice(0,60))ol.append(text("li",s.action));d.append(ol);const media=(Array.isArray(a.media)?a.media:[]).slice(0,40).map(id=>{const m=Object.hasOwn(pack.media,id)?pack.media[id]:null;return id+(m?.names?.length?" ("+m.names.join(", ")+")":"");});d.append(text("p","Indexed media: "+(media.join(" · ")||"None resolved")),text("small","Static client reference; not runtime-verified. Existing tested wiki values are unchanged."));list.append(d);}
 if(!matches.length)list.append(text("p","No matching abilities."));else if(matches.length>40)list.append(text("p","Showing 40 of "+matches.length+". Refine your search."));
}
function renderObservations(){
 const list=$("mediaSignalResults");list.replaceChildren();if(!pack)return;
 for(const o of observations.slice(0,200)){const hits=core.matchObservation(pack,o),label=o.t.toFixed(3)+" s · "+(o.actor==null?"unknown actor":"Actor "+o.actor);const row=text("p",label+" — "+(hits.length?hits.slice(0,12).map(h=>h.id+" ["+h.confidence+" reference]").join(" · "):"No indexed candidate"));list.append(row);}
 if(observations.length>200)list.append(text("p","First 200 observations shown."));
}
async function readFile(input,limit){const f=input.files?.[0];if(!f)return null;if(f.size>limit)throw Error("File exceeds local size limit");return JSON.parse(await f.text());}
function init(){
 const toggle=$("replayCueSound");
 toggle.addEventListener("change",async()=>{enabled=false;if(!toggle.checked)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error("Web Audio unsupported");context ||= new C();await context.resume();enabled=toggle.checked;$("replayCueStatus").textContent="Original substitute cues; not BLR audio.";}catch(e){toggle.checked=false;$("replayCueStatus").textContent=e.message;}});
 $("mediaPackFile").addEventListener("change",async e=>{try{const raw=await readFile(e.target,8*1024*1024);if(!raw)return;pack=core.validatePack(raw);$("mediaPackStatus").textContent="Snapshot "+pack.snapshotVersion+" · "+pack.styles.size+" styles · "+pack.abilities.size+" ability records. Local reference only.";renderAbilities();renderObservations();}catch(error){$("mediaPackStatus").textContent=error.message;}finally{e.target.value="";}});
 $("mediaAbilityQuery").addEventListener("input",renderAbilities);
 $("mediaSignalFile").addEventListener("change",async e=>{try{const raw=await readFile(e.target,2*1024*1024);if(!raw)return;if(!Array.isArray(raw)||raw.length>20000)throw Error("Expected an array of at most 20,000 observations");observations=raw.filter(o=>Number.isFinite(o?.t)&&o.t>=0&&(typeof o.signalId==="string"||Array.isArray(o.signals))).sort((a,b)=>a.t-b.t);$("mediaSignalStatus").textContent=observations.length+" valid observations; "+(pack?"candidate matches only.":"load a technical pack to match.");renderObservations();}catch(error){$("mediaSignalStatus").textContent=error.message;}finally{e.target.value="";}});
}
globalThis.ReplayMediaPanel={init,setTimeline,advance};
})();
