import {DERIVED_KITS} from './derived-kits.mjs?v=2';
import {renderAbilityMath} from './ability-math.mjs?v=4';
// Community gameplay reference. Only derived statistics; no original game source.
// Separate from manually tested values. Do not promote client timers to server-confirmed mechanics.
const S='client review · 26 Nov 2026';
const f=(label,value,unit='',kind='Client-derived')=>({label,value,unit,kind});
const cd=v=>f('Cooldown',v,'s');
const flow=(v,label='Singularity cooldown')=>f(label,v,'s');
const cfg=(label,value,unit='')=>f(label,value,unit,'Configured');
const time=(label,v)=>f(label,v,'s');
const shot=(p,t)=>[cfg('Shot power',p),cfg('Vertical tilt',t)];
const entry=(name,kit,input,variant,condition,stats,description,unknown=[])=>({name,kit,input,variant,condition,stats,description,unknown});
export const TECHNICAL_ABILITIES={
 nagi:{
  reviewedOn:S,
  summary:'Nagi and its mastery upgrades share one current style page. The separate older NEL Nagi kit is retained below for historical context, not mixed into the current kit.',
  entries:[
   entry('Trap','base','C','Regular','Available when the ball is not anchored and the ability is ready.',[cd(45),flow(38,'Singularity cleanup cooldown'),time('On-ball recast timer',2),time('Off-ball recast timer',1),time('On-ball lift sequence',0.9),f('Animation speed modifier',1.35,'×')],'Controls and lifts the ball, opening a Trap Shot follow-up. The full cooldown is applied on cleanup; actual trap protection needs testing.',['Animation length','Actual trap duration','Player i-frames','Ball i-frames']),
   entry('Trap Shot','base','C','Regular','Follow-up after Trap; possession and sufficient stamina required.',[cd(45),flow(38),time('Shot request delay',0.35),time('Scheduled cleanup',0.6),...shot(130,0.35)],'Initial velocity uses camera direction plus a vertical tilt, multiplied by shot power. The actual launch is response-dependent.',['Actual shot startup','Endlag','Player i-frames','Ball i-frames','First landing range']),
   entry('Dash','base','V','Regular','Ability ready.',[cd(30)],'Lateral dash. The client selects left or right from movement direction. It does not establish actual travel distance or movement duration.',['Dash distance','Dash duration','Player i-frames','Endlag']),
   entry('Skull Trap','base','C','Mastery I','Ability ready; ball not anchored; no existing trap state.',[cd(40),flow(34),time('Recast timer',1.5),time('Animation stop timer',3),time('Post-cleanup cooldown delay',1.4)],'Replaces Trap at mastery I. Opens Breakdance Shot; timers and possession changes can end the trap earlier.',['Animation length','Actual duration','Player i-frames','Ball i-frames']),
   entry('Breakdance Shot','base','C','Mastery I','On-ball; Skull Trap follow-up state; ability ready.',[cd(40),flow(34),time('Shot request delay',1.5),time('Scheduled cleanup',2),...shot(170,0.1),cfg('Shot height parameter',20)],'Replaces Trap Shot at mastery I. The shared shooting helper clamps the vertical aim component to at least 0.1, then applies effective power without normalization. Release remains response-dependent.',['Actual shot startup','Endlag','Player i-frames','Ball i-frames','First landing range']),
   entry('Zero Reset Turn','base','V','Mastery II','On-ball, grounded, ability ready; not trapped.',[cd(45),flow(38.25),cfg('Movement distance parameter',63,'stud'),f('Initial forward target',5,'stud'),time('Initial dash time parameter',0.1),time('Curved movement delay',0.2),time('Scheduled cleanup',0.6)],'Curved movement uses a quadratic Bézier steering path. The 63-stud configuration is used in velocity calculation, not guaranteed displacement.',['Actual dash distance','Actual duration','Player i-frames','Ball i-frames']),
   entry('Direct Heel Lift','base','B','Mastery III','On-ball, grounded, ability ready; not trapped.',[cd(35),flow(29.75),cfg('Forward dash target',60,'stud'),time('Dash time parameter',0.5),time('Scheduled cleanup',1.5),...shot(160,0.15)],'Forward movement followed by a shot through a shared helper. A configured movement target is not the same as measured travel.',['Actual shot startup','Animation length','Endlag','Player i-frames','Ball i-frames','First landing range']),
   entry('I Am Nagi','awakening','B','Regular','Awakened, grounded, on-ball; ball not anchored; ability ready.',[cd(70),time('Request delay',0.1),time('Fallback cleanup',10),f('Shot power',161.5),f('Vertical tilt',0.2)],'Cutscene shot with camera-direction velocity. The actual cutscene and release depend on the response; the fallback timer is not the cutscene length.',['Cutscene length','Actual shot startup','Player i-frames','Ball i-frames','First landing range']),
   entry('Effortless Miracle','awakening','V','Mastery IV','Awakened; loose ball within 30 studs, world Y ≥ 14; ability ready. Excludes goalkeeper-associated ball if goalkeeper is in the penalty area.',[cfg('Cooldown',30,'s'),...shot(200,0.1),time('Fallback cleanup',16)],'Available before Effortless Miracle is used in an awakening; the V slot then displays Zero Reset Turn.',['Actual cutscene length','Shot startup','Player i-frames','Ball i-frames','First landing range']),
   entry('Five Stage Volley','awakening','B','Mastery IV','Awakened, on-ball, grounded; ability ready.',[cfg('Cooldown',70,'s'),...shot(200,0.18),time('Fallback cleanup',38)],'On-ball awakened volley variant. The helper schedules a fallback cleanup; normal release is triggered by a response. This is not the measured cutscene length.',['Actual cutscene length','Shot startup','Player i-frames','Ball i-frames','First landing range']),
   entry('Two Stage Volley','awakening','B','Mastery IV','Awakened, off-ball; opponent-held ball condition and ability ready.',[cfg('Cooldown',70,'s'),...shot(171,0.18),time('Fallback cleanup',16)],'Off-ball awakened volley variant. Server acceptance and exact range remain unverified.',['Actual cutscene length','Shot startup','Player i-frames','Ball i-frames','First landing range'])
  ],
  archive:'The separate older NEL Nagi kit lists Trap / Trap Shot / Side Trap Shot, Zero Reset Turn and Juggling Shot, with Death Dance, Five Stage Volley / Two Stage Volley and Tap Lift / Space Shot in awakening. It may predate the mastery rework; the export alone does not establish its active modes or dates. Trap Dance and Trap CR modules also exist, but their current availability is not confirmed.',
  awakeningNote:'Awakening IV replaces the regular C kit with Skull Trap / Breakdance Shot, V with Effortless Miracle (then Zero Reset Turn after use), and B with the possession-dependent volley. Without mastery IV, regular Trap / Trap Shot and Dash remain available during awakening.',
  chemicalNote:'A historical NEL Nagi–NEL Reo reaction is documented in the announcement archive. Its current timing and availability need gameplay verification.'
 }
};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const mechanics={
 Trap:{type:'Ball control',short:'Lift and control the ball, then use C again for Trap Shot.',context:'C → C · On/off-ball'},
 'Trap Shot':{type:'Shot',short:'Shoot the trapped ball in the camera direction with an upward lift.',context:'Trap follow-up',formula:'Initial velocity = 130 × (camera direction + upward tilt of 0.35).'},
 Dash:{type:'Movement',short:'Move laterally left or right.',context:'Direction dependent'},
 'Skull Trap':{type:'Ball control',short:'Mastery upgrade to Trap. Opens the Breakdance Shot follow-up.',context:'C → C · Replaces Trap'},
 'Breakdance Shot':{type:'Shot',short:'Shoot after Skull Trap. The release is handled by a shared shooting utility.',context:'Replaces Trap Shot'},
 'Zero Reset Turn':{type:'Dribble',short:'Move along a curved steering path while possessing the ball.',context:'Replaces Dash'},
 'Direct Heel Lift':{type:'Dash + shot',short:'Move forward and launch the ball. Requires possession and grounded movement.',context:'Unlocks B'},
 'I Am Nagi':{type:'Cutscene shot',short:'Awakening shot aimed in the camera direction.',context:'Regular awakening',formula:'Initial velocity = 161.5 × (camera direction + upward tilt of 0.2).'},
 'Effortless Miracle':{type:'Aerial cutscene',short:'Awakening air-ball move. V returns to Zero Reset Turn after use.',context:'Mastery IV · V'},
 'Five Stage Volley':{type:'Cutscene shot',short:'Possession-based awakened volley.',context:'Mastery IV · On-ball'},
 'Two Stage Volley':{type:'Cutscene shot',short:'Off-ball awakened volley targeting an opponent-held ball.',context:'Mastery IV · Off-ball'}
};

// Structured, client-side activation gates and observable phase descriptions.
// A null phase time means event-dependent or not specified, not zero seconds.
const behavior={
 Trap:{gates:['C ready','Ability use lock elapsed','Ball not anchored','Global ability lock elapsed (initial trap)'],branches:[['On-ball','Lift sequence; 2 s recast timer; 0.9 s wait before trap animation'],['Off-ball','1 s recast timer; trap animation starts without the lift wait']],phases:[['Activation','Request trap; play initial animation'],['Possession-dependent','Ball/player trap animation; cleanup may occur on loss of possession or state change'],['Cleanup','Apply full cooldown and stop trap animation']]},
 'Trap Shot':{gates:['Trap follow-up state','C ready','Ball not anchored','Stamina > 10','On-ball'],phases:[['0 s','Play shot animation'],['0.35 s','Request shot'],['Response','Set initial ball velocity'],['0.6 s','Scheduled cleanup']]},
 Dash:{gates:['V ready'],branches:[['Local movement X < 0','Left relative to character facing'],['Otherwise','Right relative to character facing']],phases:[['Activation','Select lateral direction; request movement; play matching animation'],['Server movement','Distance and duration not specified in this client module']]},
 'Skull Trap':{gates:['C ready','No internal trap state','Ball not anchored','Character not already Trapped'],phases:[['0 s','Request Skull Trap; clear existing body movers; start animation'],['0.5 s','Begin possession/state monitoring'],['Possession acquired','Pause player trap animation; keep ball animation'],['3 s','Scheduled animation stop; cleanup conditional'],['After cleanup + 1.4 s','Apply full cooldown if follow-up still pending and not shooting']]},
 'Breakdance Shot':{gates:['On-ball','C ready','No internal trap state','Character Trapped attribute'],phases:[['0 s','Start shot animation'],['1.5 s','Request shot; call shared shot helper with camera direction'],['2 s','Scheduled cleanup']]},
 'Zero Reset Turn':{gates:['On-ball','Running; not stunned, sliding or ragdolled','V ready','No internal trap state'],phases:[['0 s','Request skill; start forward dash toward 5-stud target'],['0.2 s','Start velocity-driven curved steering'],['~0.4 s','Ten 0.02 s steering tweens complete nominally; remove movement controllers'],['0.6 s','Scheduled cleanup; reset ball velocity']]},
 'Direct Heel Lift':{gates:['On-ball','Running; not stunned, sliding or ragdolled','B ready','No internal trap state'],phases:[['0 s','Start animations; request skill'],['Same activation','Start forward dash toward 60-stud target (0.5 s helper parameter); register shot helper'],['Response / helper','Shot timing and realized movement not established'],['1.5 s','Scheduled cleanup']]},
 'I Am Nagi':{gates:['On-ball','Awakened','Grounded (not jumping/freefall)','Ball not anchored','B ready'],phases:[['0 s','Disable shiftlock, enter cutscene, anchor character'],['0.1 s','Request skill; start animations; capture camera direction'],['Response','Launch ball; unanchor character; restore shiftlock'],['10 s','Fallback state/anchor cleanup']]},
 'Effortless Miracle':{gates:['Awakening mastery kit','Loose ball in workspace','Ball within 30 studs (3D)','Ball world Y ≥ 14','No goalkeeper in penalty-area association','V ready'],phases:[['Activation','Mark Effortless Miracle used; invoke cutscene helper with camera direction'],['Helper / server','Movement and cutscene duration not established']]},
 'Five Stage Volley':{gates:['Awakening mastery kit','On-ball','Running; not stunned, sliding or ragdolled','B ready'],phases:[['Activation','Invoke cutscene helper with camera direction'],['Helper / server','Movement and cutscene duration not established']]},
 'Two Stage Volley':{gates:['Awakening mastery kit','Off-ball','B ready','Ball on a character','Opponent or training dummy'],phases:[['Activation','Validate ball holder; invoke cutscene helper with camera direction'],['Helper / server','Movement and cutscene duration not established']]}
};
function renderBehavior(name){
 const b=behavior[name];if(!b)return null;const box=el('details',null,'ta-behavior');box.append(el('summary','Activation conditions & movement phases'));
 const gates=el('div',null,'ta-gates');for(const gate of b.gates)gates.append(el('span',gate));box.append(el('h4','All activation gates','ta-detail-group'),gates);
 if(b.branches){box.append(el('h4','Conditional branches','ta-detail-group'));const branch=el('dl',null,'ta-branches');for(const [a,c] of b.branches){const d=el('div');d.append(el('dt',a),el('dd',c));branch.append(d);}box.append(branch);}
 box.append(el('h4','Phase sequence','ta-detail-group'));const phases=el('ol',null,'ta-phases');for(const [at,desc] of b.phases){const item=el('li'),t=el('div',at,'ta-phase-time');item.append(t,el('div',desc,'ta-phase-text'));phases.append(item);}box.append(phases,el('p','Client-visible gates and nominal events only. Server validation and animation root motion may add conditions or alter timing.','ta-missing'));return box;
}

const keyOrder=['Cooldown','Singularity cooldown','Singularity cleanup cooldown','Shot power','Forward dash target','Movement distance parameter','On-ball recast timer','Recast timer','Shot request delay','Request delay','Dash time parameter','Off-ball recast timer'];
const labelShort={'Singularity cooldown':'With Singularity','Singularity cleanup cooldown':'With Singularity','Forward dash target':'Dash target','Movement distance parameter':'Movement parameter','On-ball recast timer':'On-ball recast','Off-ball recast timer':'Off-ball recast','Shot request delay':'Request delay','Dash time parameter':'Dash time parameter'};
function prominent(stats){return keyOrder.map(k=>stats.find(x=>x.label===k)).filter(Boolean).slice(0,4);}
function groupStat(x){if(/power|tilt|height/i.test(x.label))return 'Ball physics';if(/dash|movement|target|distance/i.test(x.label))return 'Movement';return 'Timing';}
function valueText(x,units){const distance=x.unit==='stud',converted=distance&&units==='game';const value=converted?'≈'+Number((x.value*.995).toFixed(1)):String(x.value);return value+(distance?(converted?' game m':' studs'):x.unit==='×'?'×':x.unit?' '+x.unit:'');}
const css=`
#technical-abilities{--ta-line:#303d4c;--ta-muted:#9caec3;--ta-panel:#151e2a;--ta-faint:#101923;color:#e4edf7}
#technical-abilities .ta-intro{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:7px}
#technical-abilities .ta-intro h2{border:0;padding:0;margin:0}
#technical-abilities .ta-count{font-size:.78rem;color:var(--ta-muted);white-space:nowrap}
#technical-abilities .ta-subtitle{font-size:.83rem;color:var(--ta-muted);margin:0 0 12px}
#technical-abilities .ta-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
#technical-abilities .ta-tabs{display:flex;flex:1 1 230px;gap:4px;padding:4px;background:var(--ta-faint);border:1px solid var(--ta-line);border-radius:8px}
#technical-abilities button{font:inherit;cursor:pointer;color:#a9b9cc;background:transparent;border:1px solid transparent;border-radius:5px;padding:8px 10px;min-height:36px}
#technical-abilities .ta-tabs button{flex:1;min-width:0;font-weight:600;font-size:.85rem;white-space:nowrap}
#technical-abilities button[aria-pressed=true]{background:#263b50;color:#e5f1ff;border-color:#426383}
#technical-abilities button:focus-visible,#technical-abilities select:focus-visible,#technical-abilities summary:focus-visible{outline:2px solid #8acbff;outline-offset:2px}
#technical-abilities select{font:inherit;font-size:.8rem;max-width:100%;padding:8px;background:var(--ta-faint);color:#edf4ff;border:1px solid var(--ta-line);border-radius:6px}
#technical-abilities .ta-filter{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
#technical-abilities .ta-filter label{color:var(--ta-muted);font-size:.75rem}
#technical-abilities .ta-kit-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;border:1px solid var(--ta-line);background:var(--ta-line);border-radius:8px;overflow:hidden;margin-bottom:12px}
#technical-abilities .ta-slot{background:var(--ta-faint);padding:9px 10px;min-width:0;overflow-wrap:anywhere}
#technical-abilities .ta-slot b{color:#91bce6;font-size:.77rem}
#technical-abilities .ta-slot p{font-size:.78rem;margin:3px 0;line-height:1.45;color:#d6e2f2}
#technical-abilities .ta-list{display:flex;flex-direction:column;gap:8px;min-width:0}
#technical-abilities .ta-group{font-size:.78rem;letter-spacing:.035em;color:#aebed1;font-weight:600;margin:8px 0 0;padding:0 1px}
#technical-abilities .ta-list > .ta-card{grid-area:auto!important;position:static!important;display:block;box-sizing:border-box;width:100%;padding:12px 14px;min-width:0;margin:0;background:var(--ta-panel);border:1px solid var(--ta-line);border-radius:9px}
#technical-abilities .ta-head{display:flex;gap:9px;align-items:center;min-width:0}
#technical-abilities .ta-key{display:grid;place-items:center;flex:0 0 31px;height:31px;background:#26384a;border:1px solid #3b536b;border-radius:6px;color:#c6e1ff;font:600 1rem system-ui}
#technical-abilities .ta-name{flex:1;min-width:0}
#technical-abilities .ta-name h3{font-size:1.02rem;line-height:1.25;margin:0;color:#edf4ff;overflow-wrap:anywhere}
#technical-abilities .ta-meta{font-size:.74rem;line-height:1.4;color:var(--ta-muted);margin-top:2px}
#technical-abilities .ta-type{font-size:.72rem;color:#c2d3e7;text-align:right;max-width:40%;overflow-wrap:anywhere}
#technical-abilities .ta-card p{font-size:.82rem;line-height:1.5;margin:7px 0}
#technical-abilities .ta-short{color:#dce6f2}
#technical-abilities .ta-requirements{color:#aebed0!important}
#technical-abilities .ta-gates{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0}
#technical-abilities .ta-gates span{font-size:.74rem;padding:4px 7px;border:1px solid #3b536b;background:#1b2b3c;border-radius:5px;color:#c4d8ed}
#technical-abilities .ta-branches{margin:6px 0;display:grid;gap:5px}
#technical-abilities .ta-branches>div{background:#101923;border:1px solid #303d4c;padding:8px;border-radius:5px}
#technical-abilities .ta-branches dd{font-size:.79rem;font-weight:400}
#technical-abilities .ta-phases{list-style:none!important;margin:8px 0;padding:0 0 0 8px;display:grid;gap:0}
#technical-abilities .ta-phases li{position:relative;margin:0;padding:0 0 12px 14px;border-left:1px solid #405267}
#technical-abilities .ta-phases li:before{content:"";position:absolute;left:-4px;top:4px;width:7px;height:7px;background:#91bce6;border-radius:50%}
#technical-abilities .ta-phases li:last-child{padding-bottom:0}
#technical-abilities .ta-impl+.ta-impl{border-top:1px solid #303d4c;margin-top:10px;padding-top:8px}
#technical-abilities .ta-phase-time{font-size:.74rem;font-weight:600;color:#91bce6;font-variant-numeric:tabular-nums}
#technical-abilities .ta-phase-text{font-size:.8rem;line-height:1.5;color:#d1deee}
#technical-abilities .ta-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;border:1px solid var(--ta-line);border-radius:6px;overflow:hidden;background:var(--ta-line);margin:9px 0}
#technical-abilities .ta-grid>div{background:var(--ta-faint);padding:8px 9px;min-width:0}
#technical-abilities dt{font-size:.72rem;color:var(--ta-muted);line-height:1.3}
#technical-abilities dd{margin:3px 0 0;font-size:1rem;font-weight:650;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;color:#edf4ff}
#technical-abilities .ta-foot{font-size:.72rem;color:var(--ta-muted);line-height:1.4}
#technical-abilities details{border:1px solid var(--ta-line);border-radius:7px;margin-top:10px;padding:9px 11px}
#technical-abilities .ta-card details{border:0;border-top:1px solid var(--ta-line);border-radius:0;padding:8px 0 0;margin-top:8px}
#technical-abilities summary{cursor:pointer;color:#b8cfe7;font-size:.8rem;font-weight:600}
#technical-abilities .ta-detail-group{margin:11px 0 4px;color:#a9bbcf;font-size:.74rem;text-transform:uppercase;letter-spacing:.035em}
#technical-abilities .ta-detail-rows{margin:0}
#technical-abilities .ta-detail-rows>div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:10px;padding:5px 0;border-bottom:1px solid #25313e}
#technical-abilities .ta-detail-rows dd{font-size:.83rem;text-align:right;margin:0}
#technical-abilities .ta-kind{font-size:.67rem;color:var(--ta-muted);font-weight:400;display:block}
#technical-abilities .ta-missing{color:#aebed0;font-size:.77rem!important}
#technical-abilities .ta-empty{padding:12px;border:1px dashed var(--ta-line);border-radius:7px;color:var(--ta-muted)}
#technical-abilities .ta-link{font-size:.77rem;color:#a6ccf2}
@media(max-width:620px){#technical-abilities .ta-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#technical-abilities .ta-list>.ta-card{padding:10px}#technical-abilities .ta-slot{padding:7px}#technical-abilities .ta-slot p{font-size:.72rem}#technical-abilities .ta-controls{gap:5px}#technical-abilities .ta-filter{flex:1 1 auto}#technical-abilities .ta-filter select{min-width:0}}
`;
function statsGrid(items,units){const dl=el('dl',null,'ta-grid');dl.style.gridTemplateColumns=items.length<3?'repeat('+Math.max(1,items.length)+',minmax(0,1fr))':'';for(const x of items){const row=el('div');row.title=x.kind;row.append(el('dt',labelShort[x.label]||x.label),el('dd',valueText(x,units)));dl.append(row);}return dl;}
function slotSummary(active){
 const summary=el('div',null,'ta-kit-summary');
 const rows=active==='base'?[['C','Trap → Trap Shot','I: Skull Trap → Breakdance Shot'],['V','Dash','II: Zero Reset Turn'],['B','Not available normally','III: Direct Heel Lift']]:[['C','Trap → Trap Shot','IV: Skull Trap → Breakdance Shot'],['V','Dash','IV: Effortless Miracle → Zero Reset Turn'],['B','I Am Nagi','IV: Five Stage / Two Stage Volley']];
 for(const [key,base,mastery] of rows){const slot=el('div',null,'ta-slot');slot.append(el('b',key),el('p',base),el('p',mastery));summary.append(slot);}return summary;
}

function derivedCard(a,units,expanded){
 const card=el('article',null,'announcement-card ta-card'),head=el('div',null,'ta-head'),name=el('div',null,'ta-name'),id=[a.name,a.input,a.kit,a.variant,a.sourceLine].join('|');
 const types=[...new Set(a.implementations.flatMap(i=>[...(i.shot?['Shot']:[]),...(i.motion?.length?['Movement']:[]),...(i.phases.some(p=>p.at==='Cutscene')?['Cutscene']:[])]))];
 name.append(el('h3',a.name),el('div',a.variant+' · '+(a.kit==='awakening'?'Awakening':a.kit==='chemical'?'Chemical reaction':'Base kit'),'ta-meta'));head.append(el('span',a.input,'ta-key'),name,el('span',types.join(' / ')||'Ability','ta-type'));card.append(head);
 if(a.selection.length)card.append(el('p',a.selection.join(' / '),'ta-requirements'));else card.append(el('p','Slot selection is client-derived; exact activation branch may depend on game state.','ta-requirements'));
 const all=a.implementations.flatMap(i=>i.stats),quick=[];
 for(const label of ['Client cooldown argument','Cooldown','Shot power','Dash target distance','Travel distance parameter','Distance parameter','Movement speed parameter','Ball activation range','Player activation range','Duration parameter','Cutscene fallback cleanup']){const vals=all.filter(x=>x.label===label);if(vals.length&&new Set(vals.map(x=>x.value)).size===1){if(quick.length<4)quick.push(vals[0]);}}
 if(quick.length)card.append(statsGrid(quick,units));card.append(el('div','Player i-frames · ability-specific ball i-frames · measured range — not established unless separately tested.','ta-foot'));
 const body=el('details');body.append(el('summary','Activation conditions & movement phases'));body.open=expanded.has(id+'-conditions');body.addEventListener('toggle',()=>{if(body.open)expanded.add(id+'-conditions');else expanded.delete(id+'-conditions');});
 for(const imp of a.implementations){const block=el('div',null,'ta-impl');if(a.implementations.length>1)block.append(el('h4',imp.label,'ta-detail-group'));if(imp.checks.length){const gates=el('div',null,'ta-gates');for(const q of imp.checks)gates.append(el('span',q));block.append(el('p','Checks encountered in this implementation (may belong to different branches).','ta-missing'),gates);}if(imp.phases.length){const phases=el('ol',null,'ta-phases');for(const p of imp.phases){const li=el('li');li.append(el('div',p.at,'ta-phase-time'),el('div',p.text,'ta-phase-text'));phases.append(li);}block.append(phases);}if(!imp.checks.length&&!imp.phases.length)block.append(el('p','Detailed conditions and execution order are not resolved from this implementation.','ta-missing'));body.append(block);}card.append(body);
 for(const imp of a.implementations){const m=renderAbilityMath(a.name,{shot:imp.shot,motion:imp.motion});if(m){if(a.implementations.length>1)m.querySelector('summary').append(el('span',' · '+imp.label));card.append(m);}}
 const detail=el('details');detail.append(el('summary','Timing, mechanics & verification'));detail.open=expanded.has(id+'-stats');detail.addEventListener('toggle',()=>{if(detail.open)expanded.add(id+'-stats');else expanded.delete(id+'-stats');});
 for(const imp of a.implementations){detail.append(el('h4',imp.label,'ta-detail-group'));const dl=el('dl',null,'ta-detail-rows');for(const x of imp.stats){const row=el('div'),dd=el('dd',valueText(x,units));dd.append(el('span',x.kind,'ta-kind'));row.append(el('dt',x.label),dd);dl.append(row);}if(imp.stats.length)detail.append(dl);else detail.append(el('p','No resolved numeric parameters.','ta-missing'));detail.append(el('p','Review reference: ability export, lines '+imp.source.from+'–'+imp.source.to+'.','ta-missing'));}
 detail.append(el('p','Configured values are not necessarily effective values. Callback delays are not a guaranteed execution timeline. Server overrides and animation timing require individual review and gameplay measurement.','ta-missing'));card.append(detail);return card;
}
function renderDerived(root,slug){
 const skin=slug==='easter-kaiser';const data=DERIVED_KITS[skin?'kaiser':slug];if(!data||root.querySelector('#technical-abilities'))return;
 const section=el('section',null,'wiki-details-section');section.id='technical-abilities';const intro=el('div',null,'ta-intro');intro.append(el('h2','Moveset'),el('span',data.entries.length+' slot / branch records','ta-count'));section.append(el('style',css),intro,el('p',skin?'Easter Kaiser is configured as a Kaiser skin; the following is the parent style’s client kit, not independently verified skin behavior.':'Client-kit reference · 26 Nov 2026. Names and slot bindings are source-derived; conditional branches and server behavior are not independently gameplay-verified.','ta-subtitle'));
 const controls=el('div',null,'ta-controls'),tabs=el('div',null,'ta-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Ability kit');const filter=el('div',null,'ta-filter'),variant=el('select'),units=el('select');variant.setAttribute('aria-label','Mastery level');units.setAttribute('aria-label','Distance units');
 const variants=['all',...new Set(data.entries.map(x=>x.variant))];for(const v of variants){const o=el('option',v==='all'?'All levels':v);o.value=v;variant.append(o);}for(const [v,l] of [['stud','Studs'],['game','Game m (approx.)']]){const o=el('option',l);o.value=v;units.append(o);}filter.append(variant,units);controls.append(tabs,filter);
 const search=el('input');search.type='search';search.placeholder='Search moves…';search.setAttribute('aria-label','Search technical moveset');search.style.cssText='width:100%;box-sizing:border-box;margin:5px 0 10px;padding:9px;color:inherit;background:#101923;border:1px solid #405267;border-radius:6px';
 const overview=el('div'),list=el('div',null,'ta-list');const expanded=new Set();let active='base';
 function render(){list.replaceChildren();overview.replaceChildren();for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.kit===active));const q=search.value.toLowerCase().trim(),rows=data.entries.filter(a=>a.kit===active&&(variant.value==='all'||a.variant===variant.value)&&a.name.toLowerCase().includes(q));if(active!=='chemical'){const summary=el('div',null,'ta-kit-summary');for(const key of ['C','V','B']){const item=el('div',null,'ta-slot');const names=[...new Set(rows.filter(a=>a.input===key).map(a=>a.name))];item.append(el('b',key),el('p',names.join(' / ')||'No separate replacement recorded'));summary.append(item);}overview.append(summary);if(active==='awakening')overview.append(el('p','Unchanged base slots may remain available during awakening. This view lists recorded awakening assignments.','ta-subtitle'));}if(!rows.length){list.append(el('p',active==='chemical'?'No matching dedicated reaction slot recorded here. See the configured chemical reactions section below.':'No matching moves in this kit or filter.','ta-empty'));return;}for(const key of ['C','V','B','—']){const group=rows.filter(a=>a.input===key);if(!group.length)continue;list.append(el('h3',key==='—'?'Unresolved input':key+' slot','ta-group'));for(const a of group)list.append(derivedCard(a,units.value,expanded));}}
 for(const [id,title] of [['base','Base'],['awakening','Awk'],['chemical','Chem']]){const b=el('button',title+' ('+data.entries.filter(x=>x.kit===id).length+')');b.type='button';b.dataset.kit=id;b.addEventListener('click',()=>{active=id;variant.value='all';render();});tabs.append(b);}variant.addEventListener('change',render);units.addEventListener('change',render);search.addEventListener('input',render);section.append(controls,search,overview,list);
 const about=el('details');about.append(el('summary','About these values'),el('p','This is an automatically derived starting reference from client slot definitions and matched implementations, not a fully hand-reviewed wiki. Configured ranges, power and cooldowns may be overridden. Mathematical previews model only explicitly identified launch or movement target formulas. Unknown values are kept unknown.'));const link=el('a','View manually tested abilities','ta-link');link.href='#tested-abilities';about.append(link);section.append(about);
 const anchor=[...root.querySelectorAll(':scope > .wiki-details-section')].find(s=>s.id==='tested-abilities'||['Abilities','Announced abilities','Patch history'].includes(s.querySelector('h2')?.textContent));root.insertBefore(section,anchor||null);render();
}

export function renderTechnicalAbilities(root,slug){
 if(!root||root.querySelector('#technical-abilities'))return;const data=TECHNICAL_ABILITIES[slug];if(!data){renderDerived(root,slug);return;}
 const section=el('section',null,'wiki-details-section');section.id='technical-abilities';
 const intro=el('div',null,'ta-intro');intro.append(el('h2','Moveset'),el('span',data.entries.length+' moves · 4 mastery levels','ta-count'));
 section.append(el('style',css),intro,el('p','Regular Nagi and mastery upgrades · Client-derived reference, 26 Nov 2026. Actual measurements remain separate.','ta-subtitle'));
 const controls=el('div',null,'ta-controls'),tabs=el('div',null,'ta-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Ability kit');
 const filter=el('div',null,'ta-filter'),variant=el('select'),units=el('select');variant.setAttribute('aria-label','Mastery level');units.setAttribute('aria-label','Distance units');
 for(const [v,l] of [['all','All levels'],['Regular','Regular'],['Mastery I','Mastery I'],['Mastery II','Mastery II'],['Mastery III','Mastery III'],['Mastery IV','Mastery IV']]){const o=el('option',l);o.value=v;variant.append(o);}
 for(const [v,l] of [['stud','Studs'],['game','Game m (approx.)']]){const o=el('option',l);o.value=v;units.append(o);}
 filter.append(variant,units);controls.append(tabs,filter);
 const overview=el('div'),list=el('div',null,'ta-list');let active='base';const expanded=new Set();
 function cardFor(a){
  const m=mechanics[a.name]||{type:'Ability',short:a.description,context:a.variant};
  const card=el('article',null,'announcement-card ta-card'),head=el('div',null,'ta-head'),name=el('div',null,'ta-name');
  name.append(el('h3',a.name),el('div',a.variant+' · '+m.context,'ta-meta'));head.append(el('span',a.input,'ta-key'),name,el('span',m.type,'ta-type'));card.append(head,el('p',m.short,'ta-short'));
  const quick=prominent(a.stats);if(quick.length)card.append(statsGrid(quick,units.value));
  card.append(el('p','Requires: '+a.condition,'ta-requirements'));
  const missing=a.unknown.filter(x=>/iframe|i-frame|landing|endlag/i.test(x));if(missing.length)card.append(el('div',missing.join(' · ')+' — unverified','ta-foot'));
  const detail=el('details');detail.append(el('summary','Timing, mechanics & verification'));
  detail.open=expanded.has(a.name);detail.addEventListener('toggle',()=>{if(detail.open)expanded.add(a.name);else expanded.delete(a.name);});
  detail.append(el('p',a.description));if(['Breakdance Shot','Direct Heel Lift','Effortless Miracle','Five Stage Volley','Two Stage Volley'].includes(a.name)){const cut=['Effortless Miracle','Five Stage Volley','Two Stage Volley'].includes(a.name);detail.append(el('p',cut?'Shared server cutscene shot assigns 1 s ball protection where that server path is used. Ability-specific use is not verified.':'Shared server shot helper defaults to 2 s ball protection, overridable. Ability-specific use is not verified.','ta-missing'));}if(m.formula)detail.append(el('p',m.formula));
  for(const g of ['Timing','Movement','Ball physics']){const rows=a.stats.filter(x=>groupStat(x)===g);if(!rows.length)continue;detail.append(el('h4',g,'ta-detail-group'));const dl=el('dl',null,'ta-detail-rows');for(const x of rows){const row=el('div'),dd=el('dd',valueText(x,units.value));dd.append(el('span',x.kind,'ta-kind'));row.append(el('dt',x.label),dd);dl.append(row);}detail.append(dl);}
  detail.append(el('p','Still needs testing: '+a.unknown.join(', ')+'.','ta-missing'));const math=renderAbilityMath(a.name);if(math)card.append(math);const phase=renderBehavior(a.name);if(phase)card.append(phase);card.append(detail);return card;
 }
 function render(){
  list.replaceChildren();overview.replaceChildren();for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.kit===active));
  variant.disabled=active==='chemical';units.disabled=active==='chemical';
  if(active==='chemical'){list.append(el('p',data.chemicalNote,'ta-empty'));return;}
  overview.append(slotSummary(active));if(active==='awakening')overview.append(el('p','Awakening also retains the appropriate C and V moves from the Base tab.','ta-subtitle'));
  const entries=data.entries.filter(x=>x.kit===active&&(variant.value==='all'||x.variant===variant.value));
  if(!entries.length){list.append(el('p','No exclusive abilities at this level in this kit. Choose All levels to see every move.','ta-empty'));return;}
  let last='';for(const a of entries){if(last!==a.variant){list.append(el('h3',a.variant==='Regular'?'Regular kit':a.variant,'ta-group'));last=a.variant;}list.append(cardFor(a));}
 }
 for(const [id,title] of [['base','Base'],['awakening','Awk'],['chemical','Chem']]){const b=el('button',title+' ('+data.entries.filter(x=>x.kit===id).length+')');b.type='button';b.dataset.kit=id;b.addEventListener('click',()=>{active=id;variant.value='all';render();});tabs.append(b);}
 variant.addEventListener('change',render);units.addEventListener('change',render);section.append(controls,overview,list);
 const method=el('details');method.append(el('summary','About these values'),el('p','Configured = balancing parameter. Client-derived = value or timer visible in the client implementation. Neither guarantees actual server behavior; measured shot range, animation length, i-frames and endlag require gameplay tests.'),el('p','The built-in balancing display labels floored stud displacement in game m. The field calibration remains approximate; neither is a physical metre conversion. Dash targets are not guaranteed displacement.'));
 const link=el('a','View manually tested abilities','ta-link');link.href='#tested-abilities';method.append(link);section.append(method);
 const archive=el('details');archive.append(el('summary','Historical NEL Nagi kit'),el('p',data.archive));section.append(archive);
 const anchor=[...root.querySelectorAll(':scope > .wiki-details-section')].find(s=>s.id==='tested-abilities'||['Abilities','Announced abilities','Patch history'].includes(s.querySelector('h2')?.textContent));root.insertBefore(section,anchor||null);render();
}
