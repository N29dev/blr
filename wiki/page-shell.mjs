export function updatePage(p,old,iconSpec){
 let h=old.replaceAll('/site-unify.css?v=2','/site-unify.css?v=3').replaceAll('/site-responsive.css?v=1','/site-responsive.css?v=2').replaceAll('/site-experience.js?v=4','/site-experience.js?v=5').replaceAll('/site-motion.css?v=1','/site-motion.css?v=2').replaceAll('/site-motion.js?v=1','/site-motion.js?v=2').replace(/\/wiki\/wiki\.css\?v=\d+/g,'/wiki/wiki.css?v=7').replaceAll('/wiki/app.mjs?v=2','/wiki/app.mjs?v=3');
 const route=p==='index.html'?'/':'/'+p.replace(/index\.html$/,'');
 const active=route.startsWith('/styles/')?'/styles/':route.startsWith('/flows/')?'/flows/':route.startsWith('/tech/')?'/tech/':route;
 const wiki=h.includes('data-page="wiki"');
 const primary=wiki||['servers/index.html','servers/customs/index.html','tech/index.html','tech/admin/index.html','leaderboard/index.html','404.html'].includes(p);
 if(primary){const nav=[['/','Home'],['/styles/','Styles'],['/flows/','Flows'],['/updates/','Updates'],['/servers/','Servers'],['/servers/customs/','Customs'],['/field/','Field Lab'],['/replays/','Replays'],['/tech/','Tech rules'],['/tech/#support','Support']];h=h.replace(/<div class="n29-nav-links">[\s\S]*?<\/div>/,'<div class="n29-nav-links">'+nav.map(([u,n])=>'<a href="'+u+'"'+(u===active?' aria-current="page"':'')+(u.includes('#support')?' class="n29-nav-support"':'')+'>'+n+'</a>').join('')+'</div>');}
 if(!wiki)return h;
 const tag=(name,flow,rarity,nel)=>{
   name=name.replace(/&amp;/g,'&').replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"');
   const spec=iconSpec(name,flow?'flow':'style',rarity,nel);
   const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
   return '<span class="kb-icon '+(flow?'kb-flows':'kb-styles')+'" data-palette="'+spec.palette+'"'+(spec.master?' data-master="true"':'')+' style="--icon-font:'+spec.font.toFixed(3)+'cqi" aria-hidden="true"><span class="kb-icon-label">'+spec.lines.map(l=>'<span class="kb-icon-line">'+esc(l)+'</span>').join('')+'</span></span>';
 };
 h=h.replace(/<details class="kb-mobile-nav">[\s\S]*?<\/details>/,'');
 h=h.replace(/<aside class="kb-sidebar"><nav aria-label="Wiki navigation">([\s\S]*?)<\/nav><\/aside>/,(_,inside)=>{
  const links=inside.replace(/ aria-current="(?:page|location)"/g,'').replace(/<a href="([^"]+)">/g,(m,u)=>u===active?'<a href="'+u+'" aria-current="'+(u===route?'page':'location')+'">':m);
  return '<aside class="kb-sidebar"><nav aria-label="Wiki navigation">'+links+'</nav></aside>';
 });
 const side=h.match(/<aside class="kb-sidebar"><nav aria-label="Wiki navigation">([\s\S]*?)<\/nav><\/aside>/);
 if(side)h=h.replace(/(<main class="wiki-shell kb-main" id="main">)/,'$1<details class="kb-mobile-nav"><summary>Browse wiki sections</summary><nav aria-label="Mobile wiki navigation">'+side[1]+'</nav></details>');
 h=h.replace(/<a class="kb-tile"[^>]*>[\s\S]*?<\/a>/g,card=>{
  const n=card.match(/<strong>([^<]+)<\/strong>/)?.[1];if(!n)return card;
  return card.replace(/<span class="kb-icon[^"]*"[^>]*>[^<]*<\/span>/,()=>tag(n,card.includes('href="/flows/'),card.match(/data-rarity="([^"]+)"/)?.[1]||'',card.includes('NEL shown')));
 });
 h=h.replace(/<aside class="kb-infobox">[\s\S]*?<\/aside>/g,box=>{
  const n=box.match(/<h2>([^<]+)<\/h2>/)?.[1];if(!n)return box;
  return box.replace(/<span class="kb-icon[^"]*"[^>]*>[^<]*<\/span>/,()=>tag(n,route.startsWith('/flows/'),(box.match(/<dt>Rarity \(snapshot\)<\/dt><dd>([^<]+)<\/dd>/)?.[1]||'').toLowerCase(),box.includes('<dd>NEL variant</dd>')));
 });
 return h.replace('Icons are in-game tile screenshots supplied by a contributor. Some show evolved kits. Easter Kaiser has no supplied icon.','Icons recreate the supplied in-game designs. NEL labels identify evolved kits; Easter Kaiser has an approximate design.');
}