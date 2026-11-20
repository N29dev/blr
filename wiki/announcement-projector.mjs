const GUILD='1304535758899777626', CHANNEL='1304576435800899694';
const source=id=>'https://discord.com/channels/'+GUILD+'/'+CHANNEL+'/'+id;
const ids=s=>s.trim().split(/\s+/).filter(Boolean);
const sorted=a=>a.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
const rec=(id,date,title,text)=>({id,date,title,text,source:source(id)});
export function projectAnnouncements(data,styleIds,flowIds){
  const styles=new Set(styleIds),flows=new Set(flowIds);
  const patches=sorted(data.rows.map(([date,id,title,type,style,flow,text])=>({...rec(id,date,title,text),type,styles:ids(style),flows:ids(flow)})));
  if(new Set(patches.map(p=>p.id)).size!==patches.length)throw Error('Duplicate patch id');
  for(const p of patches){if(!p.styles.every(s=>styles.has(s))||!p.flows.every(s=>flows.has(s)))throw Error('Unknown article id in '+p.id+': '+[...p.styles.filter(s=>!styles.has(s)),...p.flows.filter(s=>!flows.has(s))]);}
  const codes=sorted(data.codeRows.flatMap(([id,date,items])=>items.split(';').map(item=>{const [code,reward]=item.split('|');if(!code||!reward)throw Error('Invalid code '+item);return {id,date,code,reward,source:source(id),status:'Unverified'};})));
  const facts=sorted(data.facts.map(([id,date,kind, targets,title,text])=>({...rec(id,date,title,text),kind,targets:ids(targets)})));
  for(const f of facts){const known=f.kind==='flow'?flows:styles;if(!f.targets.every(s=>known.has(s)))throw Error('Unknown record target '+f.id+': '+f.targets.filter(s=>!known.has(s)));}
  const abilities={};
  for(const [slug,[id,date,...groups]] of Object.entries(data.kits)){
    if(!styles.has(slug)||groups.length%2)throw Error('Invalid kit '+slug);
    const result=abilities[slug]=[];
    for(let i=0;i<groups.length;i+=2)for(const line of groups[i+1].split(';')){
      const [name,input,condition]=line.split('|');
      if(!name||input===undefined||condition===undefined)throw Error('Invalid ability '+line);
      result.push({id,date,kit:groups[i],name,input,condition,source:source(id)});
    }
  }
  for(const [slug,extra] of Object.entries(data.extra))for(const [id,date,kit,name,input,condition] of extra)(abilities[slug]??=[]).push({id,date,kit,name,input,condition,source:source(id)});
  const files={'updates':patches,'codes':codes,'abilities':Object.entries(abilities).map(([slug,rows])=>({slug,count:rows.length,date:rows.map(x=>x.date).sort().at(-1)}))};
  for(const kind of ['mechanics','progression','cosmetics'])files[kind]=facts.filter(f=>f.kind===kind);
  files.evolutions=facts.filter(f=>f.kind==='progression'&&f.targets.length);
  for(const slug of styleIds)files['styles/'+slug]={abilities:abilities[slug]||[],facts:facts.filter(f=>f.kind!=='flow'&&f.targets.includes(slug)),history:patches.filter(p=>p.styles.includes(slug)).map(({styles,flows,...p})=>p)};
  for(const slug of flowIds)files['flows/'+slug]={facts:facts.filter(f=>f.kind==='flow'&&f.targets.includes(slug)),history:patches.filter(p=>p.flows.includes(slug)).map(({styles,flows,...p})=>p)};
  return files;
}
