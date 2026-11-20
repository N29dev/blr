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
// The reference tiles wrap selected names at spaces, never inside a word.
export const ICON_FONT_FAMILY='"Arial Black", Arial, system-ui, sans-serif';
const REFERENCE_LINES=new Map([
 ...['NEL Isagi','NEL Nagi','NEL Rin','NEL Aiku','NEL King','NEL Reo','Ace Eater','Wild Card'].map(name=>[name,name]),
 ['NEL Bachira','NEL|Bachira'],['NEL Chigiri','NEL|Chigiri'],['NEL Shidou','NEL|Shidou'],
 ['Bloodmoon Rin','Blood|Moon Rin'],['Demon Shidou','Demon|Shidou'],['Don Lorenzo','Don|Lorenzo'],
 ['Easter Yukimiya','Easter|Yukimiya'],['Elf Emperor','Elf|Emperor'],['Firework Bachira','Firework|Bachira'],
 ['Gingerbread Charles','Gingerbread|Charles'],['Krampus Barou','Krampus|Barou'],
 ['McNagi Fryshiro','McNagi|Fryshiro'],['Phantom Isagi','Phantom|Isagi'],['Reaper Sae','Reaper|Sae'],
 ['Santa Lavinho','Santa|Lavinho'],['Skeleton Nagi','Skeleton|Nagi'],['Subzero Loki','Subzero|Loki'],
 ['Awakened Genius','Awakened|Genius'],['Bee Freestyle','Bee|Freestyle'],["Buddha's Blessing","Buddha's|Blessing"],
 ['Butterfly Dancer','Butterfly|Dancer'],['Crown Messenger','Crown|Messenger'],['Demon King','Demon|King'],
 ['Demon Wings','Demon|Wings'],['Destructive Impulses','Destructive|Impulses'],['Homeless Man','Homeless|Man'],
 ["King's Authority","King's|Authority"],['Magician Flow','Magician|Flow'],
 ['Master Of All Trades','Master Of|All Trades'],['Target Man','Target|Man']
].map(([key,value])=>[key.toLowerCase(),value.split('|')]));
// Widths are measured once in the browser at 100px. The pure fallback is
// deliberately conservative; all font sizes are percentages of the tile width.
export function labelLayout(title,measure=text=>text.length*.72){
  const words=title.trim().split(/\s+/).filter(Boolean);
  const normalized=words.join(' ');
  let lines=REFERENCE_LINES.get(normalized.toLowerCase())||[normalized];
  if(!REFERENCE_LINES.has(normalized.toLowerCase())&&words.length>1&&measure(normalized)*15>74){
    let best=Infinity;
    for(let i=1;i<words.length;i++){
      const pair=[words.slice(0,i).join(' '),words.slice(i).join(' ')];
      const widths=pair.map(measure);
      const score=Math.max(...widths)+Math.abs(widths[0]-widths[1])*.13;
      if(score<best){best=score;lines=pair;}
    }
  }
  const longest=Math.max(...lines.map(measure),.01);
  const maxFont=lines.length>1?18:29;
  return {lines:[...lines],font:Math.min(maxFont,74/longest)};
}
export function iconSpec(name,type='style',rarity='',nel=false,measure){
  const title=(nel&&type==='style'?'NEL ':'')+name;
  const palette=type==='flow'?(FLOW_COLORS.get(name.toLowerCase())||'silver'):(nel?'silver':STYLE_OVERRIDES[name.toLowerCase()]||STYLE_COLORS[rarity]||'silver');
  return {palette,master:type==='style'&&rarity==='master',...labelLayout(title,measure)};
}
