/* Shared, dependency-free quality-of-life interactions for N29 BL:R.
   The leaderboard intentionally does not load this script. */
(() => {
  'use strict';
  const page = document.body.dataset.page || '';
  // One directory of destinations shared by the quick-jump search and page footer.
  // Keep the private /tech/admin/ route out of public navigation.
  const links = [
    { group:'Play', icon:'⌂', title:'BL:R hub', detail:'Overview, profile and all available tools', url:'/' },
    { group:'Play', icon:'🌐', title:'Public server finder', detail:'Compare sampled Roblox server regions and open slots', url:'/servers/' },
    { group:'Play', icon:'⚽', title:'8v8 matches', detail:'Browse public 8v8 servers', url:'/servers/?mode=8v8' },
    { group:'Play', icon:'🏆', title:'Pro servers', detail:'Browse competitive public servers', url:'/servers/?mode=pro' },
    { group:'Play', icon:'🤝', title:'Community customs', detail:'Find player-hosted custom matches', url:'/servers/customs/' },
    { group:'Play', icon:'🤖', title:'Glutony Discord app', detail:'Install BL:R server finder commands in Discord', url:'https://discord.com/oauth2/authorize?client_id=1563907646757666926&integration_type=1&scope=applications.commands' },
    { group:'Rules', icon:'📜', title:'Allowed & banned tech', detail:'Search BL:R styles, techs and punishable bugs', url:'/tech/' },
    { group:'Rules', icon:'🔎', title:'Check if a tech is allowed', detail:'How to ask BL:R support staff about a technique', url:'/tech/#support' },
    { group:'Create', icon:'🎬', title:'Creator Studio', detail:'Patch, compress, analyze and download videos', url:'/tools/' },
    { group:'Create', icon:'✂️', title:'MP4 clipper', detail:'Trim part of a public direct MP4', url:'/clipper.html' },
    { group:'Create', icon:'📥', title:'TikTok downloader & repair', detail:'Download and repair MP4 duration metadata', url:'/tiktok-downloader.html' },
    { group:'Create', icon:'🏅', title:'CC leaderboard (Sep 2026 archive)', detail:'Historical creator event results, not current rankings', url:'/leaderboard/' },
    { group:'Support', icon:'🛡️', title:'Ban appeal help', detail:'Support server and appeals channel for bug-abuse bans', url:'/tech/#support' },
    { group:'Support', icon:'💬', title:'BL:R support server', detail:'Join the official support Discord for tickets and appeals', url:'https://discord.gg/dgV4p83EHA' },
    { group:'Support', icon:'🌍', title:'Main BL:R Discord', detail:'Blue Lock: Rivals community server', url:'https://discord.gg/bluelockrivals' },
    { group:'More', icon:'★', title:'N29 player stats', detail:'In-game profile statistics on the homepage', url:'/#stats' },
    { group:'More', icon:'💠', title:'N29 community Discord', detail:'Join N29’s own community server', url:'/#discord' },
    { group:'More', icon:'✦', title:'N29 portfolio', detail:'The portfolio behind BL:R and Glutony', url:'https://n29.kz/' }
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
    dialog.id='n29-quick-jump';
    const top=createNode('div','site-command-top');
    top.append(createNode('strong','', 'Quick navigation'));
    const close=createNode('button','site-command-close','Esc ✕');
    close.type='button';
    close.setAttribute('aria-label','Close navigation');
    top.append(close);
    const query=createNode('input','site-command-search');
    query.type='search';query.placeholder='Search pages, servers, tools…';
    query.setAttribute('aria-label','Search pages and tools');
    query.autocomplete='off';query.spellcheck=false;
    const list=createNode('div','site-command-list');
    const help=createNode('div','site-command-help','Type to filter · ↑ ↓ select · Enter open · Esc close');
    dialog.append(top,query,list,help);
    document.body.append(dialog);

    let active=0;
    let visible=[];
    let lastFocus=null;

    const render=()=>{
      const term=query.value.trim().toLocaleLowerCase();
      visible=links.filter(link=>(link.group+' '+link.title+' '+link.detail).toLocaleLowerCase().includes(term));
      active=0;
      list.replaceChildren();
      if(!visible.length) {
        list.append(createNode('div','site-command-empty','No results. Try “servers”, “TikTok”, or “customs”.'));
        return;
      }
      let lastGroup='';
      visible.forEach((link,i)=>{
        if(link.group!==lastGroup){
          list.append(createNode('div','site-command-group',link.group));
          lastGroup=link.group;
        }
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
    // One identical label, shortcut and accessible trigger on every page.
    const macShortcut=/Mac|iPhone|iPad/i.test(navigator.platform||'');
    document.querySelectorAll('[data-command-open]').forEach(btn=>{
      btn.type='button';
      btn.setAttribute('aria-label','Open Quick Jump search');
      btn.setAttribute('aria-haspopup','dialog');
      btn.setAttribute('aria-controls','n29-quick-jump');
      btn.replaceChildren(
        createNode('span','n29-search-icon','⌕'),
        createNode('span','n29-search-label','Quick jump'),
        createNode('kbd','',macShortcut?'⌘ K':'Ctrl K')
      );
      btn.addEventListener('click',openDialog);
    });

    if(!document.querySelector('[data-command-open]')) {
      const fab=createNode('button','site-command-fab');
      fab.type='button';
      fab.setAttribute('aria-label','Open quick navigation');
      fab.append(createNode('span','','⌕ Pages & tools'),createNode('kbd','',navigator.platform?.includes('Mac')?'⌘ K':'Ctrl K'));
      fab.addEventListener('click',openDialog);
      document.body.append(fab);
    }
  }

  // Reusable, accessible site map rendered only at explicit public-page placeholders.
  // Existing page navigation remains functional if this enhancement does not load.
  function initSiteConnections(){
    const mount=document.querySelector('[data-site-connect]');
    if(!mount)return;
    const cards=[
      {category:'PLAY',title:'Find your next match',icon:'⚽',links:[
        {label:'Public servers',href:'/servers/'},
        {label:'Community customs',href:'/servers/customs/'},
        {label:'Install Glutony',href:'https://discord.com/oauth2/authorize?client_id=1563907646757666926&integration_type=1&scope=applications.commands'}
      ]},
      {category:'LEARN',title:'Understand the rules',icon:'📜',links:[
        {label:'Allowed & banned tech',href:'/tech/'},
        {label:'Tech inquiries',href:'/tech/#support'}
      ]},
      {category:'CREATE',title:'Make better clips',icon:'🎬',links:[
        {label:'Creator tools',href:'/tools/'},
        {label:'MP4 clipper',href:'/clipper.html'},
        {label:'TikTok downloader',href:'/tiktok-downloader.html'},
        {label:'CC leaderboard (archive)',href:'/leaderboard/'}
      ]},
      {category:'SUPPORT',title:'Get help',icon:'🛡️',links:[
        {label:'Ban appeals / Support',href:'/tech/#support'},
        {label:'Join support server',href:'https://discord.gg/dgV4p83EHA'},
        {label:'BL:R community Discord',href:'https://discord.gg/bluelockrivals'}
      ]}
    ];
    const section=createNode('nav','site-connect');
    section.setAttribute('aria-label','Explore the BL:R hub');
    const header=createNode('div','site-connect-heading');
    const text=createNode('div','');
    text.append(createNode('span','site-connect-eyebrow','EXPLORE BL:R'),createNode('h2','', 'Everything is connected.'));
    header.append(text);
    const hub=createNode('a','site-connect-hub','Visit the hub ↗');hub.href='/';
    header.append(hub);
    section.append(header);
    const grid=createNode('div','site-connect-grid');
    for(const card of cards){
      const group=createNode('div','site-connect-card');
      const head=createNode('div','site-connect-card-head');
      head.append(createNode('span','site-connect-card-icon',card.icon));
      const headings=createNode('div','site-connect-card-headings');
      headings.append(createNode('span','site-connect-category',card.category),createNode('h3','',card.title));
      head.append(headings);group.append(head);
      for(const item of card.links){
        const anchor=createNode('a','site-connect-link',item.label);
        anchor.href=item.href;
        if(/^https:\/\//.test(item.href)){anchor.target='_blank';anchor.rel='noopener noreferrer';}
        if(item.href===location.pathname+location.search||item.href===location.pathname||
           (item.href==='/servers/'&&page==='servers')||
           (item.href==='/tech/'&&page==='tech')||
           (item.href==='/tools/'&&location.pathname==='/tools/')||
           (item.href==='/servers/customs/'&&page==='customs')||
           (item.href==='/clipper.html'&&page==='clipper')||
           (item.href==='/tiktok-downloader.html'&&page==='tiktok')){
          anchor.setAttribute('aria-current','page');
        }
        group.append(anchor);
      }
      grid.append(group);
    }
    section.append(grid);
    mount.replaceChildren(section);
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
  try { initSiteConnections(); } catch(error) { console.warn('Site map enhancement unavailable',error); }
  if(page==='home') {
    try { initHomeFilters(); } catch(error) { console.warn('Tool filters unavailable',error); }
  }
})();
