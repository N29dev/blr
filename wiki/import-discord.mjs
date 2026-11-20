// Local-only review queue. Do not commit its output or the original Discord export.
// node wiki/import-discord.mjs updates-page-1.json updates-page-2.json > review.local.json
import {readFileSync} from 'node:fs';
const CHANNEL='1304576435800899694', GUILD='1304535758899777626';
const files=process.argv.slice(2);
if(!files.length)throw Error('Provide exported message JSON files');
const byId=new Map();
for(const file of files){
 const data=JSON.parse(readFileSync(file,'utf8'));if(!Array.isArray(data))throw Error('Expected array of Discord messages: '+file);
 for(const m of data){
  if(m.channel_id!==CHANNEL||! /^\d+$/.test(m.id)||!Number.isFinite(Date.parse(m.timestamp)))continue;
  const old=byId.get(m.id);if(old&&Date.parse(old.edited_timestamp||old.timestamp)>Date.parse(m.edited_timestamp||m.timestamp))continue;
  byId.set(m.id,m);
 }
}
const review=[...byId.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)).map(m=>{
 const content=String(m.content||'').replace(/<a?:\w+:\d+>|<@!?\d+>|<@&\d+>|@everyone|@here/g,'').replace(/\|\|/g,'').trim();
 const relevant=/(?:\b(?:update|rework|revamp|patch|fixed|fixes|added|buffed|nerfed|cooldown|rarity|code|released|moveset|rebalances?)\b|^[#*-].{10,})/im.test(content);
 return {id:m.id,date:m.timestamp,edited:m.edited_timestamp||null,source:'https://discord.com/channels/'+GUILD+'/'+CHANNEL+'/'+m.id,review_status:relevant?'candidate':'other',content,has_media:!!(m.attachments?.length||m.embeds?.length)};
});
console.log(JSON.stringify({channel:CHANNEL,count:review.length,review},null,2));
