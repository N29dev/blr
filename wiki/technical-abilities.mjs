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
   entry('Skull Trap','base','C','Mastery I','Ability ready; ball not anchored; no existing trap state.',[cd(40),flow(34),time('Recast timer',1.5),time('Animation stop timer',3)],'Replaces Trap at mastery I. Opens Breakdance Shot; timers and possession changes can end the trap earlier.',['Animation length','Actual duration','Player i-frames','Ball i-frames']),
   entry('Breakdance Shot','base','C','Mastery I','On-ball Skull Trap follow-up; ability ready.',[cd(40),flow(34),time('Shot request delay',1.5),time('Scheduled cleanup',2),...shot(170,0.1),cfg('Shot height parameter',20)],'Replaces Trap Shot at mastery I. Shared shooting helper handles the launch; its exact release and trajectory need verification.',['Actual shot startup','Endlag','Player i-frames','Ball i-frames','First landing range']),
   entry('Zero Reset Turn','base','V','Mastery II','On-ball, grounded, ability ready; not trapped.',[cd(45),flow(38.25),cfg('Movement distance parameter',63,'stud'),f('Initial forward target',5,'stud'),time('Initial dash time parameter',0.1),time('Curved movement delay',0.2),time('Scheduled cleanup',0.6)],'Curved movement uses a quadratic Bézier steering path. The 63-stud configuration is used in velocity calculation, not guaranteed displacement.',['Actual dash distance','Actual duration','Player i-frames','Ball i-frames']),
   entry('Direct Heel Lift','base','B','Mastery III','On-ball, grounded, ability ready; not trapped.',[cd(35),flow(29.75),cfg('Forward dash target',60,'stud'),time('Dash time parameter',0.5),time('Scheduled cleanup',1.5),...shot(160,0.15)],'Forward movement followed by a shot through a shared helper. A configured movement target is not the same as measured travel.',['Actual shot startup','Animation length','Endlag','Player i-frames','Ball i-frames','First landing range']),
   entry('I Am Nagi','awakening','B','Regular','Awakened, grounded, on-ball; ball not anchored; ability ready.',[cd(70),time('Request delay',0.1),time('Fallback cleanup',10),f('Shot power',161.5),f('Vertical tilt',0.2)],'Cutscene shot with camera-direction velocity. The actual cutscene and release depend on the response; the fallback timer is not the cutscene length.',['Cutscene length','Actual shot startup','Player i-frames','Ball i-frames','First landing range']),
   entry('Effortless Miracle','awakening','V','Mastery IV','Awakened; air-ball condition and ability ready.',[cfg('Cooldown',30,'s'),...shot(200,0.1),time('Cutscene helper time argument',16)],'Available before Effortless Miracle is used in an awakening; the V slot then displays Zero Reset Turn.',['Actual cutscene length','Shot startup','Player i-frames','Ball i-frames','First landing range']),
   entry('Five Stage Volley','awakening','B','Mastery IV','Awakened, on-ball, grounded; ability ready.',[cfg('Cooldown',70,'s'),...shot(200,0.18),time('Cutscene helper time argument',38)],'On-ball awakened volley variant. The cutscene helper argument is not a measured animation or cutscene length.',['Actual cutscene length','Shot startup','Player i-frames','Ball i-frames','First landing range']),
   entry('Two Stage Volley','awakening','B','Mastery IV','Awakened, off-ball; opponent-held ball condition and ability ready.',[cfg('Cooldown',70,'s'),...shot(171,0.18),time('Cutscene helper time argument',16)],'Off-ball awakened volley variant. Server acceptance and exact range remain unverified.',['Actual cutscene length','Shot startup','Player i-frames','Ball i-frames','First landing range'])
  ],
  archive:'The separate older NEL Nagi kit lists Trap / Trap Shot / Side Trap Shot, Zero Reset Turn and Juggling Shot, with Death Dance, Five Stage Volley / Two Stage Volley and Tap Lift / Space Shot in awakening. It may predate the mastery rework; the export alone does not establish its active modes or dates. Trap Dance and Trap CR modules also exist, but their current availability is not confirmed.',
  awakeningNote:'At mastery IV, Skull Trap / Breakdance Shot also replace the C slot; Zero Reset Turn returns to V after Effortless Miracle is used. With mastery IV disabled, the regular awakening kit applies.',
  chemicalNote:'A historical NEL Nagi–NEL Reo reaction is documented in the announcement archive. Its current timing and availability need gameplay verification.'
 }
};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const css=`
#technical-abilities .ta-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
#technical-abilities .ta-tabs{display:flex;flex:1 1 210px;gap:4px;padding:4px;background:#111923;border:1px solid #334153;border-radius:9px}
#technical-abilities button{font:inherit;cursor:pointer;color:#acbbce;background:transparent;border:1px solid transparent;border-radius:6px;padding:8px 10px}
#technical-abilities .ta-tabs button{flex:1;min-width:0;font-weight:600}
#technical-abilities button[aria-pressed=true]{background:#25384c;color:#e5f1ff;border-color:#41617c}
#technical-abilities button:focus-visible,#technical-abilities select:focus-visible{outline:2px solid #8acbff;outline-offset:2px}
#technical-abilities select{font:inherit;max-width:100%;padding:8px;background:#111923;color:#edf4ff;border:1px solid #334153;border-radius:6px}
#technical-abilities .ta-list{display:flex;flex-direction:column;gap:8px;min-width:0}
#technical-abilities .ta-list > .ta-card{grid-area:auto!important;position:static!important;display:block;box-sizing:border-box;width:100%;padding:12px 14px;min-width:0;margin:0}
#technical-abilities .ta-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
#technical-abilities .ta-head h3{font-size:1rem;margin:0}
#technical-abilities .ta-meta,#technical-abilities .ta-source{font-size:.75rem;color:#acbbce}
#technical-abilities .ta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,125px),1fr));gap:6px;margin:8px 0}
#technical-abilities .ta-grid>div{padding:7px 9px;background:#111923;border:1px solid #2d3949;border-radius:6px;min-width:0}
#technical-abilities dt{font-size:.73rem;color:#acbbce;line-height:1.35}
#technical-abilities dd{margin:3px 0;font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;color:#edf4ff}
#technical-abilities .ta-card p{font-size:.84rem;line-height:1.5;margin:7px 0}
#technical-abilities details{margin-top:12px;border:1px solid #334153;padding:10px;border-radius:8px}
#technical-abilities summary{cursor:pointer;color:#cbd9e8}
@media(max-width:400px){#technical-abilities .ta-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#technical-abilities .ta-card{padding:10px}}
`;
export function renderTechnicalAbilities(root,slug){
 const data=TECHNICAL_ABILITIES[slug];if(!data||!root||root.querySelector('#technical-abilities'))return;
 const section=el('section',null,'wiki-details-section');section.id='technical-abilities';
 section.append(el('style',css),el('h2','Technical ability reference'),el('p',data.summary),el('p','Provisional client-derived reference · 26 Nov 2026. Configured parameters and client timers are not measured server-side behavior. Manually tested values remain separate.','wiki-muted'));
 const controls=el('div',null,'ta-controls'),tabs=el('div',null,'ta-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Ability kit');
 const units=el('select');units.setAttribute('aria-label','Distance units');for(const [v,l] of [['stud','Studs'],['game','Game m (approx.)']]){const opt=el('option',l);opt.value=v;units.append(opt);}
 const info=el('p','Distances are configuration targets, not measured travel. Game m uses the provisional field scale (approx. 0.995 game m per stud), not real-world metres.','wiki-muted');
 const list=el('div',null,'ta-list');let active='base';
 const render=()=>{list.replaceChildren();for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.kit===active));
 if(active==='awakening')list.append(el('p',data.awakeningNote,'wiki-muted'));
 if(active==='chemical'){list.append(el('p',data.chemicalNote,'wiki-muted'));return;}
 for(const a of data.entries.filter(x=>x.kit===active)){
  const card=el('article',null,'announcement-card ta-card'),head=el('div',null,'ta-head');head.append(el('h3',a.name),el('span',a.input+' · '+a.variant,'ta-meta'));card.append(head,el('p',a.description));
  const stats=el('dl',null,'ta-grid');
  for(const x of a.stats){const row=el('div'),distance=x.unit==='stud',converted=distance&&units.value==='game',v=converted?'≈'+Number((x.value*.995).toFixed(1)):String(x.value),unit=distance?(converted?' game m':' studs'):x.unit?' '+x.unit:'';row.append(el('dt',x.label),el('dd',v+unit),el('span',x.kind,'ta-source'));stats.append(row);}
  card.append(stats,el('p','Requirements: '+a.condition),el('p','Not yet verified: '+a.unknown.join(', ')+'.','wiki-muted'));list.append(card);
 }
 };
 for(const [id,title] of [['base','Base'],['awakening','Awk'],['chemical','Chem']]){const b=el('button',title);b.type='button';b.dataset.kit=id;const count=data.entries.filter(x=>x.kit===id).length;b.textContent=title+' ('+count+')';b.addEventListener('click',()=>{active=id;render();});tabs.append(b);}
 units.addEventListener('change',render);controls.append(tabs,units);section.append(controls,info,list);
 const archive=el('details');archive.append(el('summary','Older NEL Nagi kit (archive)'),el('p',data.archive));section.append(archive);
 const anchor=[...root.querySelectorAll(':scope > .wiki-details-section')].find(s=>['Abilities','Announced abilities','Patch history'].includes(s.querySelector('h2')?.textContent));root.insertBefore(section,anchor||null);render();
}
