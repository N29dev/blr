import {FIELDS,needsRetest,wikiRequest} from './tested-data.mjs?v=1';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
export async function renderTestedAbilities(root,slug,history){
 const section=el('section',null,'wiki-details-section');section.id='tested-abilities';section.append(el('h2','Manually tested abilities'));
 const note=el('p','Loading tested values…','wiki-muted');section.append(note);const anchor=[...root.querySelectorAll(':scope > .wiki-details-section')].find(s=>['Announced abilities','Abilities','Patch history'].includes(s.querySelector('h2')?.textContent));root.insertBefore(section,anchor||null);
 try{
 const {entries}=await wikiRequest('/styles/'+slug);if(!Array.isArray(entries))throw Error();
 if(!entries.length){note.textContent='No manually tested values published yet.';return;}
 note.textContent='Separate from announcement history. Values marked “Review after patch” may need retesting; later style announcements do not prove a specific stat changed.';
 for(const r of entries.sort((a,b)=>a.kit.localeCompare(b.kit)||a.name.localeCompare(b.name))){
  const card=el('article',null,'announcement-card');card.append(el('h3',r.name+' · '+r.kit),el('p','Tested '+r.testedOn+(needsRetest(r,history)?' · Review after patch':''),'wiki-muted'));
  const dl=el('dl');for(const [key,label,type] of FIELDS.filter(([k])=>!['name','kit','testedOn','evidence'].includes(k))){
   const value=r[key];if(value===null||value===undefined||value==='')continue;const dt=el('dt',label),dd=el('dd',String(value));dd.style.whiteSpace='pre-wrap';dd.style.margin='2px 0 8px';dl.append(dt,dd);
  }card.append(dl);
  if(r.evidence){try{const u=new URL(r.evidence);if(u.protocol==='https:'){const a=el('a','Testing evidence ↗');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}}catch{}}
  section.append(card);
 }
 }catch{note.textContent='Tested values are currently unavailable. Announcement history below remains available.';}
}
