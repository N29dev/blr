// Icon APPEARANCE, not game rarity. Colors are based on the October 2026
// supplied screenshots. Silver is deliberately not interpreted as a rarity.
const FLOW_PALETTES={
  blue:['Buddha\'s Blessing','Lightning','Puzzle'],
  purple:['Genius','Ice','Monster','Stealth'],
  gold:['Crow','Demon Wings','Dribbler','Magician Flow','Trap','Wild Card'],
  red:['Bee Freestyle','Contrarian','King\'s Authority','Snake']
};
const FLOW_COLORS=new Map(Object.entries(FLOW_PALETTES).flatMap(([palette,names])=>names.map(name=>[name.toLowerCase(),palette])));
const STYLE_COLORS={rare:'blue',epic:'purple',legendary:'gold',mythic:'red',world:'silver',limited:'silver',other:'silver',master:'silver'};
const STYLE_OVERRIDES={igaguri:'blue',karasu:'purple',loki:'loki',lavinho:'lavinho'};
// Preserve NEL appearance when the supplied icon represented the evolved kit.
export function iconSpec(name,type='style',rarity='',nel=false){
  const title=(nel&&type==='style'?'NEL ':'')+name;
  const palette=type==='flow'?(FLOW_COLORS.get(name.toLowerCase())||'silver'):(nel?'silver':STYLE_OVERRIDES[name.toLowerCase()]||STYLE_COLORS[rarity]||'silver');
  const words=title.split(/\s+/);
  let lines=[title];
  if(title.length>10&&words.length>1){
    let best=Infinity;
    for(let i=1;i<words.length;i++){
      const pair=[words.slice(0,i).join(' '),words.slice(i).join(' ')];
      const score=Math.max(...pair.map(s=>s.length))+Math.abs(pair[0].length-pair[1].length)*.2;
      if(score<best){best=score;lines=pair;}
    }
  }
  const longest=Math.max(...lines.map(s=>s.length),1);
  return {palette,master:type==='style'&&rarity==='master',lines,font:Math.min(29,135/Math.max(longest,5))};
}
