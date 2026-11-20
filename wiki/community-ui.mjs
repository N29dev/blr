import {COMMUNITY_NOTES} from './community-notes.mjs?v=1';
const base='https://bluelockrivals-roblox.fandom.com/wiki/';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
export function addCommunityReferences(root,route){
 const rows=COMMUNITY_NOTES[route];if(!rows?.length||root.querySelector('#community-reference'))return;
 const s=el('section',null,'wiki-details-section');s.id='community-reference';
 s.append(el('h2','Community references'),el('p','Historical third-party reports for research and retesting. Separate from official patch notes and manually tested values. The indexed articles may predate recent updates.','wiki-muted'));
 for(const [page,title,summary,related] of rows){
  const card=el('article',null,'announcement-card');card.append(el('h3',title),el('p',summary));
  const a=el('a','Blue Lock: Rivals Wiki · '+decodeURIComponent(page).replaceAll('_',' ')+' ↗');a.href=base+page;a.target='_blank';a.rel='noopener noreferrer';card.append(a);
  if(related.length){const links=el('div',null,'announcement-links');for(const path of related){const link=el('a','Related: '+path.split('/').filter(Boolean).at(-1).replaceAll('-',' '));link.href=path;links.append(link);}card.append(links);}
  s.append(card);
 }
 const credit=el('p','Source: Blue Lock: Rivals Wiki contributors on Fandom. Independent paraphrased notes based on indexed article excerpts; not an official endorsement.','wiki-muted');
 const license=el('a','Source content license (CC BY-SA)');license.href='https://creativecommons.org/licenses/by-sa/3.0/';license.target='_blank';license.rel='noopener noreferrer';credit.append(document.createTextNode(' '),license);s.append(credit);
 root.append(s);
}
