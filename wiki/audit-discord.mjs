import {readFileSync} from 'node:fs';
import data from './announcement-data.mjs';
const files=process.argv.slice(2);
if(!files.length)throw Error('Provide one or more local Discord JSON exports.');
const channel='1304576435800899694', guild='1304535758899777626';
const byId=new Map();
for(const file of files){
 const rows=JSON.parse(readFileSync(file,'utf8'));
 if(!Array.isArray(rows))throw Error('Expected message array in '+file);
 for(const m of rows){
  if(m.channel_id!==channel||!/^\d+$/.test(m.id)||!Number.isFinite(Date.parse(m.timestamp)))continue;
  const old=byId.get(m.id);
  if(old&&Date.parse(old.edited_timestamp||old.timestamp)>Date.parse(m.edited_timestamp||m.timestamp))continue;
  byId.set(m.id,m);
 }
}
const refs=[...data.rows.map(r=>[r[1],r[0]]),...Object.values(data.kits).map(r=>[r[0],r[1]]),...Object.values(data.extra).flat().map(r=>[r[0],r[1]]),...data.codeRows.map(r=>[r[0],r[1]]),...data.facts.map(r=>[r[0],r[1]])];
const referenced=new Set(refs.map(r=>r[0]));
const missing=[...referenced].filter(id=>!byId.has(id));
const dateMismatch=refs.filter(([id,date])=>byId.has(id)&&new Date(byId.get(id).timestamp).toISOString().slice(0,10)!==date);
const patterns={
 ability:/\b(?:moveset|base skills?|base moves?|awakening moves?|ability|abilities|key|cutscene|passive)\b/i,
 balance:/\b(?:buff(?:ed|s)?|nerf(?:ed|s)?|cooldowns?|cd|iframes?|hitbox(?:es)?|range|rebalanc\w*|shot power|endlag)\b/i,
 fix:/\b(?:fix(?:ed|es)?|bug(?:s|ged)?|hotfix|patch)\b/i,
 flow:/\bflows?\b/i,
 progression:/\b(?:quests?|evolution|mastery|academy|contract|ladder|battlepass|rebirth)\b/i,
 chemistry:/\b(?:chemistry|chemical reaction|chem)\b/i,
 codes:/\b(?:codes?|rerolls?|lucky spins?)\b/i,
 release:/\b(?:rework|revamp|released|release|added|unvaulted|vaulted|reverted|removed|update log)\b/i,
 cosmetics:/\b(?:cosmetics?|emotes?|playercards?|bundles?|goal effect|jerseys?)\b/i,
 mechanics:/\b(?:hitbox|possession|physics|slide|tackle|dribbl\w*|goalkeep\w*|private server|overtime|ping|fps)\b/i
};
const rows=[...byId.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)).map(m=>{
 const text=String(m.content||'').replace(/<a?:\w+:\d+>|<@!?\d+>|<@&\d+>|@everyone|@here/g,'').replace(/^[ |*#_\n]+|[ |*#_\n]+$/g,'');
 const categories=Object.entries(patterns).filter(([,re])=>re.test(text)).map(([k])=>k);
 const hasMedia=Boolean(m.attachments?.length||m.embeds?.length);
 return {id:m.id,date:m.timestamp,source:'https://discord.com/channels/'+guild+'/'+channel+'/'+m.id,categories,triage:categories.length?'candidate':text||hasMedia?'context_or_media':'empty',containsPlanningLanguage:/\b(?:not (?:added|released|ready)|coming soon|will be|planned|tomorrow|tommorow|next (?:week|patch)|gonna|later today)\b/i.test(text),hasMedia,externalDocumentLinks:(text.match(/https?:\/\/[^\s<>]+/g)||[]).filter(x=>x.includes('docs.google.com')),referenced:referenced.has(m.id)};
});
const count=key=>rows.filter(r=>r.triage===key).length;
console.log(JSON.stringify({method:'Automated candidate screening, not line-by-line manual verification.',messages:rows.length,counts:{candidate:count('candidate'),context_or_media:count('context_or_media'),empty:count('empty')},curatedSources:referenced.size,missing,dateMismatch,unreferencedCandidates:rows.filter(r=>r.triage==='candidate'&&!r.referenced).length,rows},null,2));
if(missing.length||dateMismatch.length)process.exitCode=1;
