/* Matchday mode picker — navigation only; no invented server counts. */
(() => {
  'use strict';
  if(document.body.dataset.page!=='home')return;
  const options={
    '8v8':{title:'8v8 public matches',description:'Find a team, check open slots, and explore the world map of regions.',label:'Find 8v8 servers',href:'/servers/?mode=8v8'},
    pro:{title:'Pro servers',description:'Explore competitive public lobbies with open spots.',label:'Find Pro servers',href:'/servers/?mode=pro'},
    customs:{title:'Community custom matches',description:'Discover matches hosted by the BL:R community.',label:'Explore customs',href:'/servers/customs/'}
  };
  const buttons=Array.from(document.querySelectorAll('[data-matchday-mode]'));
  const title=document.getElementById('matchday-mode-title');
  const desc=document.getElementById('matchday-mode-description');
  const go=document.getElementById('matchday-go');
  if(!buttons.length||!title||!desc||!go)return;
  function select(mode) {
    const item=options[mode];
    if(!item)return;
    for(const button of buttons){
      button.setAttribute('aria-pressed',String(button.dataset.matchdayMode===mode));
    }
    title.textContent=item.title;
    desc.textContent=item.description;
    go.href=item.href;
    go.replaceChildren(document.createTextNode(item.label+' '));
    const arrow=document.createElement('span');
    arrow.textContent='↗';
    arrow.setAttribute('aria-hidden','true');
    go.append(arrow);
  }
  buttons.forEach(btn=>btn.addEventListener('click',()=>select(btn.dataset.matchdayMode)));
  select('8v8');
})();