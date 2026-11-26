import {KIT_INDEX} from './kit-index.mjs?v=1';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const reactions=[
['Sae','Aiku','Selfish Captain',120,'Server-armed'],
['Snuffy','King','Rebellion',120,'Server-armed'],
['Ness','Kaiser','Illusion Cross',120,'Server-armed'],
['Sae','Shidou','Dragon Drive',120,'Server-armed'],
['Charles','Shidou','Shidou × Charles',120,'Server-armed'],
['Hiori','Isagi','No-Look Away Cross',0,'Server-armed; configured cooldown 0 is not proof of unlimited use'],
['Charles','Loki','Rabona Cross',250,'Center proximity and opponent penalty-box condition'],
['Gingerbread Charles','Subzero Loki','Subzero × Gingerbread',120,'Players within 160 studs'],
['Lavinho','Bachira','Bachira × Lavinho',120,'Players within 160 studs'],
['Santa Lavinho','Firework Bachira','Firework Bachira × Santa Lavinho',120,'Players within 160 studs'],
['Kiyora','Kaiser','Kaiser × Kiyora',0,'Server-armed; configured cooldown 0 is not proof of unlimited use'],
['Bachira','Isagi','I AM... A STRIKER!',0,'Server-armed; configured cooldown 0 is not proof of unlimited use']
];
const flows={
'Genius':['Epic','30% team flow upon activation.'],
'Monster':['Epic','Reduced dribble cooldown; no possession speed penalty.'],
'Wild Card':['Legendary','Random speed, strength or stamina boost, with a possible all-three outcome.'],
'Target Man':['World Class','Stronger aerial volleys; described 1.5× jump, +20% speed, +25% shot and +50% header strength. Listed unobtainable.'],
'Puzzle':['Rare','Speed increase and reduced stamina consumption.'],
'Lightning':['Rare','Increased shot strength.'],
'Demon Wings':['Legendary','Higher jump, stronger headers and shots.'],
'Easter':['Limited','Higher jump, stronger headers and shots.'],
'Stealth':['Epic','Faster stamina recovery and shot release.'],
"King's Authority":['Mythic','Described 25% tackle cooldown reduction, stamina benefits, ankle-break duration and flow bonuses, shot power.'],
'Snake':['Mythic','Two additional headers, increased header power and speed, reduced tackle cooldown.'],
'Destructive Impulses':['World Class','Curved basic shots, speed, tackle cooldown, steal flow and recovery bonuses.'],
'Trap':['Legendary','Receiving speed and shot-power boost; described 50% Trap and Dash cooldown reduction.'],
'Dribbler':['Legendary','Shot strength, possession speed, extended dribbles, ankle-break flow.'],
'Ice':['Epic','Speed, high-arc passes, 15 flow to teammates and pass-receiver speed.'],
'Butterfly Dancer':['Master','Additional dribbles, cooldown and ankle-break improvements, speed, small shot and flow bonuses.'],
'Crown Messenger':['Master','Auto-tracking passes, described +7% speed, 10% less stamina drain, +2 dribbles, +30 teammate flow, 15% ability cooldown reduction and other recovery/tackle benefits.'],
"Buddha's Blessing":['Rare','Described extra 25% ankle-break chance without dribble, speed and shot power. Listed unobtainable.'],
'Crow':['Legendary','Shot strength and faster tackles.'],
'Ace Eater':['World Class','Described 10% base ability cooldown reduction, speed, one additional header and dribble.'],
'Awakened Genius':['World Class','More dribbles, lightly curved stronger shots, stamina reduction, 20% flow on activation and tracking passes.'],
'Emperor':['World Class','Shot power, speed and described 20% ability cooldown reduction.'],
'Bee Freestyle':['Mythic','Additional dribbles, shorter dribble cooldown, movement speed and ankle-break improvements.'],
'Godspeed':['Master','Velocity, acceleration, stamina recovery, shot power, charge speed and skill cooldown benefits.'],
'Master Of All Trades':['World Class','Described 25% Chameleon cooldown reduction, +4% movement speed, tracking/high-arc passes, +1 dribble, 7% tackle cooldown reduction and +5% shot/volley power.'],
'Singularity':['World Class','One extra dribble, more accurate passes, receiver speed and 20% Trap cooldown reduction as described; shot/volley power and speed.'],
'Contrarian':['Mythic','Speed, tracking high-arc passes, 10 teammate flow and pass-receiver speed.'],
'Demon King':['World Class','Stronger volleys, shots, speed, longer tackle and lower stamina drain.'],
'Magician Flow':['Legendary','Slight speed increase, tracking passes, recipient speed and shot power.'],
'Brazil':['Limited','Shot strength, possession speed, longer dribbles and ankle-break flow. Listed unobtainable.'],
'Spain':['Limited','Random speed, strength or stamina boost, with a possible all-three outcome. Listed unobtainable.']
};
const css=`
.wr-ref{margin:12px 0;min-width:0}.wr-ref .wr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.wr-ref .wr-item{padding:10px;border:1px solid #34465a;background:#17222f;border-radius:7px;min-width:0}.wr-ref .wr-item h3{margin:0 0 5px;font-size:.95rem;overflow-wrap:anywhere}.wr-ref .wr-item p,.wr-ref p{font-size:.81rem;line-height:1.55}.wr-ref .wr-param{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin:5px 0}.wr-ref .wr-param div{min-width:0;padding:6px;background:#101923;border-radius:5px}.wr-ref dt{font-size:.72rem;color:#a9bbce}.wr-ref dd{margin:3px 0 0;color:#edf4ff;font-size:.9rem;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.wr-ref .wr-note{color:#a9bbce;font-size:.75rem}.wr-ref input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #405267;border-radius:6px;background:#101923;color:#edf4ff;margin:8px 0}.wr-ref details{margin:8px 0}.wr-ref summary{cursor:pointer;font-weight:600;color:#b8cfe7}@media(max-width:620px){.wr-ref .wr-grid{grid-template-columns:1fr}}
`;
function section(root,title){const s=el('section',null,'wiki-details-section wr-ref');s.append(el('style',css),el('h2',title));const anchor=[...root.querySelectorAll(':scope > .wiki-details-section')].find(n=>['Announced abilities','Abilities','Patch history'].includes(n.querySelector('h2')?.textContent));root.insertBefore(s,anchor||null);return s;}
function parameters(item,params){if(!params.length){item.append(el('p','Parameters not individually reviewed.','wr-note'));return;}const dl=el('dl',null,'wr-param');for(const p of params){const d=el('div');d.append(el('dt',p.label),el('dd',p.value+(p.unit?' '+p.unit:'')));dl.append(d);}item.append(dl);}
function reactionList(root,slugValue){const list=slugValue?reactions.filter(r=>slug(r[0])===slugValue||slug(r[1])===slugValue):reactions;if(!list.length)return;const s=section(root,'Configured chemical reactions');s.append(el('p','Configuration snapshot · 26 Nov 2026. Server-armed reactions and exact acceptance remain subject to runtime rules.','wr-note'));for(const [a,b,name,cd,note] of list){const item=el('div',null,'wr-item');item.append(el('h3',name),el('p',a+' → '+b+' · '+cd+' s configured cooldown'),el('p',note,'wr-note'));s.append(item);}}
export function renderStyleReference(root,id){if(!root||root.querySelector('.wr-ref'))return;const data=KIT_INDEX[id];if(data&&id!=='nagi'){const s=section(root,'Technical moveset reference');s.append(el('p',data.entries.length+' client-kit names and conditional variants · 26 Nov 2026. Parameter candidates from the balancing configuration, not confirmed cooldowns, distances or timings. Some variants may be historical or unavailable; exact slot and conditions await individual review.','wr-note'));const search=el('input');search.type='search';search.placeholder='Search this moveset…';search.setAttribute('aria-label','Search technical moveset');const grid=el('div',null,'wr-grid');function render(){grid.replaceChildren();const q=search.value.trim().toLowerCase();for(const a of data.entries.filter(a=>a.name.toLowerCase().includes(q))){const item=el('div',null,'wr-item');item.append(el('h3',a.name));parameters(item,a.parameters);item.append(el('p','Player / ball i-frames · actual path · activation timing: unverified','wr-note'));grid.append(item);}if(!grid.children.length)grid.append(el('p','No matching abilities.'));}search.addEventListener('input',render);s.append(search,grid);render();}reactionList(root,id);}
export function renderFlowReference(root,id){const found=Object.entries(flows).find(([name])=>slug(name)===id);if(!found||root.querySelector('.wr-ref'))return;const [name,[rarity,desc]]=found,s=section(root,'Flow configuration');s.append(el('p',name+' · '+rarity),el('p',desc),el('p','Paraphrased configuration description; actual multipliers and stacking are not guaranteed by a description. Snapshot 26 Nov 2026.','wr-note'));}
export function renderMechanicsReference(root,route){if(!root||root.querySelector('.wr-ref'))return;if(route==='mechanics'){const s=section(root,'Shared gameplay mathematics');const rows=[
['Physics snapshot','Gravity 142 stud/s²; ball mass 2.10145; friction 1; elasticity 0.5. Observed in one game instance.'],
['Shot vector','Legacy additive tilt: v = P(d + kŷ). Shared helper: replace the vertical component of d with max(dᵧ,k), then multiply by effective power. No renormalization.'],
['Ball drag','60 Hz accumulated steps. Horizontal multiplier starts at 0.999 and decreases by 1/3000 each step at world Y ≤ 18; upward velocity increment 1.36667 stud/s when 8 < Y < 27. Stops at speed ≤ 10 or possession.'],
['Dash target','Quadratic ease-out: D[1 − (1 − t/T)²]. The position constraint follows an obstacle-adjusted target, not an exact teleport.'],
['Protection','Shared standard-shot helper defaults to 2 s of ball protection; shared cutscene shot 1 s, pass 2 s. Ability-specific overrides and player protection remain unverified.'],
['Shot distance','Built-in visualizer tracks flight and stops at world Y < 9.5 or its speed/time condition; displays floor of 3D displacement in game m. Not a physical metre conversion.'],
['Air-ball rule','Default 30-stud 3D radius, world Y ≥ 14, loose workspace ball, excludes a goalkeeper-associated ball when that goalkeeper is in the penalty area.'],
['Grounded rule','Running humanoid state; not stunned, ragdolled or sliding.']
];for(const [title,desc] of rows){const item=el('div',null,'wr-item');item.append(el('h3',title),el('p',desc));s.append(item);}reactionList(root);}
 if(route==='progression'||route==='evolutions'){const s=section(root,'Mastery and progression reference');s.append(el('p','The kit resolver can replace individual moves based on mastery level and disabled-level settings. Awakening may use a separate set of replacements. Older NEL modules are not automatically part of the current moveset.'),el('p','Exact unlock tasks and rewards must be linked to the current progression configuration, not inferred from older kits.','wr-note'));}
}
