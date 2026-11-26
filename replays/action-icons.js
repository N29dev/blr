/* Original replay pictograms, inspired by the mobile controls. No game assets. */
const replayIconBall = '<circle cx="12" cy="12" r="10" fill="#f7ffff"/><path d="M12 7 17 10.5 15 16.5 9 16.5 7 10.5Z M4 5 8 6 7 10.5 2 12 2 8Z M20 5 16 6 17 10.5 22 12 22 8Z M3 16 8 16 9 21 6 21Z M21 16 16 16 15 21 18 21Z" fill="#133747"/><path d="M12 7V2 M7 10.5 3 9 M17 10.5 21 9 M9 16.5 7 21 M15 16.5 17 21" stroke="#133747" stroke-width="1" fill="none"/>';
const replayIconShapes = Object.freeze({
 run: '<circle cx="38" cy="15" r="5.4"/><path d="M19 28 25 19 34 24 42 27 47 20 M34 24 27 35 37 42 43 49 M27 35 18 43 12 36" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(41 34) scale(.59)">'+replayIconBall+'</g>',
 pass: '<path d="M18 13H35V7L51 20 35 33V27H18Z M46 37H29V31L13 44 29 57V51H46Z"/>',
 dribble: '<circle cx="39" cy="14" r="6"/><path d="M33 23Q39 19 44 25L48 35 44 38 40 31 39 43 47 52 42 56 31 44 30 53 24 55 25 40 27 29 23 37 19 34 26 24Z"/><g transform="translate(9 42) scale(.55)">'+replayIconBall+'</g>',
 kick: '<path d="M5 44Q17 44 22 35 26 27 37 29 30 35 32 42 19 46 13 47ZM9 49Q23 51 34 44L39 49Q26 55 15 52Z"/><g transform="translate(29 16) scale(1.12)">'+replayIconBall+'</g>',
 slide: '<circle cx="43" cy="17" r="5.4"/><path d="M27 15 34 24 44 26 51 35 M40 25 28 34 13 36 M28 34 18 43 8 42" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 48H32 M24 52H44 M34 43H51" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".7"/>',
 dive: '<circle cx="43" cy="17" r="5"/><path d="M49 23 56 15 M45 25 54 25 M43 25 29 31 17 30 M29 31 18 40 9 39" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M9 47H36 M20 51H48" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".65"/>',
 goal: '<path d="M12 42V15H52V42 M12 15 19 22H45L52 15 M19 22V42 M45 22V42 M27 22V33 M36 22V33 M19 28H45" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(23 33) scale(.75)">'+replayIconBall+'</g>',
 save: '<path d="M32 10 49 17V32Q49 45 32 55 15 45 15 32V17Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><g transform="translate(21 20) scale(.92)">'+replayIconBall+'</g><path d="M24 45 29 49 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
 steal: '<path d="M11 31 24 20V27H38V35H24V42Z"/><g transform="translate(35 16) scale(.85)">'+replayIconBall+'</g><path d="M45 43H22" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="3 5"/>',
 ankle: '<path d="M22 11 32 25 25 34 40 45 49 45 50 52H37L20 39 17 29 24 23 15 15Z"/><path d="M39 10 34 19 42 18 38 28 51 15 43 16 47 10Z"/>',
 bicycle: '<circle cx="17" cy="35" r="5"/><path d="M23 33 34 27 37 15 47 10 M34 27 46 34 51 24 M23 33 16 43 9 43" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><g transform="translate(43 5) scale(.6)">'+replayIconBall+'</g>',
 stunned: '<path d="M32 8 35 20 47 16 42 27 55 32 42 37 47 49 35 44 32 56 28 44 17 49 22 37 9 32 22 27 17 16 28 20Z"/><path d="M32 25V35 M32 40V41" stroke="#133747" stroke-width="3.8" stroke-linecap="round"/>'
});
const replayIconMap=Object.freeze({shot:'kick',pass_count:'pass',assist:'pass',goal_credit:'goal',ankle_break:'ankle',steal_attempt:'steal'});
const replayIconCache=new Map();
function replayActionIcon(type){
 const key=Object.hasOwn(replayIconMap,type)?replayIconMap[type]:type;
 if(!Object.hasOwn(replayIconShapes,key))return null;
 if(!replayIconCache.has(key)){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="bg"><stop stop-color="#061923"/><stop offset=".72" stop-color="#0b2636"/><stop offset="1" stop-color="#11475d"/></radialGradient><linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3290f7"/><stop offset=".58" stop-color="#48e0ee"/><stop offset="1" stop-color="#2979e9"/></linearGradient></defs><circle cx="32" cy="32" r="30.5" fill="url(#bg)" stroke="url(#rim)" stroke-width="2.5"/><g color="#f5ffff" fill="#f5ffff">'+replayIconShapes[key]+'</g></svg>';
  replayIconCache.set(key,'data:image/svg+xml,'+encodeURIComponent(svg));
 }
 const img=document.createElement('img');img.className='replay-action-icon';img.alt='';img.width=30;img.height=30;img.decoding='async';img.src=replayIconCache.get(key);return img;
}
function populateReplayIconLegend(){
 const legend=document.getElementById('actionIconLegend');
 if(!legend)return;
 for(const [key,name] of [['run','Run'],['pass','Pass'],['dribble','Dribble'],['kick','Kick'],['slide','Slide'],['dive','Dive'],['goal','Goal'],['save','Save'],['steal','Steal']]){
  const item=document.createElement('span'),icon=replayActionIcon(key),text=document.createElement('span');
  text.textContent=name;item.append(icon,text);legend.append(item);
 }
}
