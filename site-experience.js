/* Shared, dependency-free quality-of-life interactions for N29 BL:R.
   The leaderboard intentionally does not load this script. */
(() => {
  'use strict';
  const page = document.body.dataset.page || '';
  const links = [
    { icon:'✦', title:'N29 portfolio', detail:'Explore N29 projects and profile', url:'https://n29.kz/' },
    { icon:'⌂', title:'Overview', detail:'Return to the BL:R home page', url:'/' },
    { icon:'🌐', title:'Server finder', detail:'Browse public BL:R servers', url:'/servers/' },
    { icon:'🏟️', title:'Main lobbies', detail:'Find sampled main-game servers', url:'/servers/?mode=main' },
    { icon:'⚽', title:'8v8 servers', detail:'Find public 8v8 matches', url:'/servers/?mode=8v8' },
    { icon:'🏆', title:'Pro servers', detail:'Browse competitive public matches', url:'/servers/?mode=pro' },
    { icon:'🤝', title:'Custom matches', detail:'Find community-hosted lobbies', url:'/servers/customs/' },
    { icon:'★', title:'Player stats', detail:'N29 in-game profile statistics', url:'/#stats' },
    { icon:'🎞️', title:'Creator tools', detail:'Video patcher, TikTok analyzer and compressor', url:'/#tools' },
    { icon:'✂️', title:'MP4 clipper', detail:'Export part of a direct MP4 URL', url:'/clipper.html' },
    { icon:'📥', title:'TikTok downloader', detail:'Download and repair a public TikTok MP4', url:'/tiktok-downloader.html' },
    { icon:'💬', title:'Community Discord', detail:'Join N29’s BL:R community', url:'/#discord' }
  ];

  function createNode(tag, className, text) {
    const el=document.createElement(tag);
    if(className) el.className=className;
    if(text!=null) el.textContent=text;
    return el;
  }

  function initCommandFinder() {
    const dialog=createNode('dialog','site-command-dialog');
    dialog.setAttribute('aria-label','Find a page or tool');
    const top=createNode('div','site-command-top');
    top.append(createNode('strong','', 'Quick navigation'));
    const close=createNode('button','site-command-close','Esc ✕');
    close.type='button';
    close.setAttribute('aria-label','Close navigation');
    top.append(close);
    const query=createNode('input','site-command-search');
    query.type='search';query.placeholder='Search servers, tools, community…';
    query.setAttribute('aria-label','Search pages and tools');
    query.autocomplete='off';query.spellcheck=false;
    const list=createNode('div','site-command-list');
    const help=createNode('div','site-command-help','↑ ↓ to select · Enter to open · Esc to close');
    dialog.append(top,query,list,help);
    document.body.append(dialog);

    let active=0;
    let visible=[];
    let lastFocus=null;

    const render=()=>{
      const term=query.value.trim().toLocaleLowerCase();
      visible=links.filter(link=>(link.title+' '+link.detail).toLocaleLowerCase().includes(term));
      active=0;
      list.replaceChildren();
      if(!visible.length) {
        list.append(createNode('div','site-command-empty','No results. Try “servers”, “TikTok”, or “customs”.'));
        return;
      }
      visible.forEach((link,i)=>{
        const a=createNode('a','site-command-item');
        a.href=link.url;
        a.setAttribute('data-current',i===active?'true':'false');
        const icon=createNode('span','site-command-emoji',link.icon);
        icon.setAttribute('aria-hidden','true');
        const text=createNode('span','');
        text.append(createNode('strong','',link.title),createNode('small','',link.detail));
        const arrow=createNode('span','site-command-chevron','↗');
        arrow.setAttribute('aria-hidden','true');
        a.append(icon,text,arrow);
        list.append(a);
      });
    };
    const syncActive=()=>{
      const rows=list.querySelectorAll('.site-command-item');
      rows.forEach((row,i)=>row.setAttribute('data-current',String(i===active)));
      rows[active]?.scrollIntoView({block:'nearest'});
    };
    function openDialog() {
      if(dialog.open)return;
      lastFocus=document.activeElement;
      query.value='';
      render();
      if(typeof dialog.showModal==='function')dialog.showModal();
      else dialog.setAttribute('open','');
      query.focus();
    }
    function closeDialog() {
      if(dialog.open)dialog.close();
      else dialog.removeAttribute('open');
    }
    close.addEventListener('click',closeDialog);
    query.addEventListener('input',render);
    query.addEventListener('keydown',event=>{
      if(!visible.length)return;
      if(event.key==='ArrowDown'||event.key==='ArrowUp') {
        event.preventDefault();
        active=(active+(event.key==='ArrowDown'?1:-1)+visible.length)%visible.length;
        syncActive();
      } else if(event.key==='Enter') {
        event.preventDefault();
        window.location.assign(visible[active].url);
      }
    });
    dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();});
    dialog.addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus();});
    document.addEventListener('keydown',event=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k') {
        event.preventDefault();
        dialog.open?closeDialog():openDialog();
      } else if(event.key==='Escape'&&dialog.open) {
        event.preventDefault();
        closeDialog();
      }
    });
    document.querySelectorAll('[data-command-open]').forEach(btn=>btn.addEventListener('click',openDialog));

    if(!document.querySelector('[data-command-open]')) {
      const fab=createNode('button','site-command-fab');
      fab.type='button';
      fab.setAttribute('aria-label','Open quick navigation');
      fab.append(createNode('span','','⌕ Pages & tools'),createNode('kbd','',navigator.platform?.includes('Mac')?'⌘ K':'Ctrl K'));
      fab.addEventListener('click',openDialog);
      document.body.append(fab);
    }
  }

  function initHomeFilters() {
    const grid=document.querySelector('#tools .creator-tools-grid');
    const filters=document.querySelector('.site-tool-filters');
    if(!grid||!filters)return;
    const cards=Array.from(grid.children).filter(el=>el.classList.contains('tool-card'));
    cards.forEach(card=>{
      const kicker=card.querySelector('.tool-kicker')?.textContent?.toLowerCase()||'';
      const title=card.querySelector('h3')?.textContent?.toLowerCase()||'';
      card.dataset.toolGroup=(kicker.includes('tiktok')||title.includes('tiktok'))?'tiktok':'video';
    });
    const buttons=Array.from(filters.querySelectorAll('button[data-tool-filter]'));
    function setFilter(value) {
      if(!['all','video','tiktok'].includes(value))value='all';
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.toolFilter===value)));
      cards.forEach(card=>card.hidden=value!=='all'&&card.dataset.toolGroup!==value);
    }
    buttons.forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.toolFilter)));
    setFilter('all');
  }

  document.querySelectorAll('.site-command-inline kbd').forEach(kbd=>{ kbd.textContent=navigator.platform?.includes('Mac')?'⌘ K':'Ctrl K'; });
  try { initCommandFinder(); } catch(error) { console.warn('Navigation enhancement unavailable',error); }
  if(page==='home') {
    try { initHomeFilters(); } catch(error) { console.warn('Tool filters unavailable',error); }
  }
})();
