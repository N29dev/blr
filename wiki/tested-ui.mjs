import {FIELDS,needsRetest,wikiRequest} from './tested-data.mjs?v=2';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={input:'Input',cooldown:'Cooldown',playerIframes:'Player i-frames',ballIframes:'Ball i-frames',duration:'Duration',range:'Range',chargeTime:'Charge time',condition:'Conditions',effect:'Effects',notes:'Notes'};
const seconds=new Set(['cooldown','playerIframes','ballIframes','duration','chargeTime']);
const css=`
#tested-abilities .tested-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:10px;align-items:start}
#tested-abilities .tested-card{padding:12px 14px;margin:0;min-width:0}
#tested-abilities .tested-header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px}
#tested-abilities .tested-header h3{font-size:1rem;line-height:1.35;margin:0}
#tested-abilities .tested-kit,#tested-abilities .tested-date{font-size:.75rem;line-height:1.4;color:#acbbce}
#tested-abilities .tested-date{margin:4px 0 10px}
#tested-abilities .tested-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,112px),1fr));gap:6px;margin:0}
#tested-abilities .tested-stat{background:#111923;border:1px solid #2d3949;border-radius:6px;padding:7px 9px;min-width:0}
#tested-abilities dt{font-size:.72rem;line-height:1.35;color:#acbbce;margin:0 0 3px}
#tested-abilities dd{font-size:.95rem;line-height:1.4;font-weight:600;margin:0;color:#edf4ff;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#tested-abilities .tested-text{display:grid;gap:5px;margin:9px 0 0}
#tested-abilities .tested-detail{display:grid;grid-template-columns:minmax(76px,auto) minmax(0,1fr);gap:8px;align-items:baseline}
#tested-abilities .tested-detail dt,#tested-abilities .tested-detail dd{font-size:.82rem;margin:0;white-space:pre-wrap}
#tested-abilities .tested-detail dd{font-weight:400}
#tested-abilities .tested-evidence{display:inline-block;font-size:.78rem;margin-top:8px}
#tested-abilities .tested-review{color:#f8ce83}
@media(max-width:400px){#tested-abilities .tested-card{padding:10px}#tested-abilities .tested-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
export async function renderTestedAbilities(root,slug,history){
 const section=el('section',null,'wiki-details-section');section.id='tested-abilities';const style=el('style',css);section.append(style,el('h2','Manually tested abilities'));
 const note=el('p','Loading tested values…','wiki-muted');section.append(note);const anchor=[...root.querySelectorAll(':scope > .wiki-details-section')].find(s=>['Announced abilities','Abilities','Patch history'].includes(s.querySelector('h2')?.textContent));root.insertBefore(section,anchor||null);
 try{
 const {entries}=await wikiRequest('/styles/'+slug);if(!Array.isArray(entries))throw Error();
 if(!entries.length){note.textContent='No manually tested values published yet.';return;}
 note.textContent='Tested in-game values. “Review after patch” indicates possible changes.';
 const list=el('div',null,'tested-list');section.append(list);
 for(const r of entries.sort((a,b)=>a.kit.localeCompare(b.kit)||a.name.localeCompare(b.name))){
  const card=el('article',null,'announcement-card tested-card'),header=el('div',null,'tested-header');header.append(el('h3',r.name),el('span',r.kit,'tested-kit'));card.append(header);
  const review=needsRetest(r,history),date=el('p','Tested '+r.testedOn,'tested-date');if(review)date.append(el('span',' · Review after patch','tested-review'));card.append(date);
  const stats=el('dl',null,'tested-stats'),details=el('dl',null,'tested-text');
  for(const [key,label,type] of FIELDS.filter(([k])=>!['name','kit','testedOn','evidence'].includes(k))){
   const value=r[key];if(value===null||value===undefined||value==='')continue;
   const long=type==='textarea',row=el('div',null,long?'tested-detail':'tested-stat');
   const formatted=String(value)+(seconds.has(key)?' s':key==='range'?' m':'');row.append(el('dt',labels[key]||label),el('dd',formatted));(long?details:stats).append(row);
  }
  if(stats.childElementCount)card.append(stats);if(details.childElementCount)card.append(details);
  if(r.evidence){try{const u=new URL(r.evidence);if(u.protocol==='https:'){const a=el('a','Testing evidence ↗','tested-evidence');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}}catch{}}
  list.append(card);
 }
 }catch{note.textContent='Tested values are currently unavailable. Announcement history below remains available.';}
}
