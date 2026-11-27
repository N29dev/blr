/* Shared, dependency-free quality-of-life interactions for N29 BL:R.
   The leaderboard intentionally does not load this script. */
(() => {
  'use strict';
  const page = document.body.dataset.page || '';
  // One directory of destinations shared by the quick-jump search and page footer.
  // Keep the private /tech/admin/ route out of public navigation.
  const links = [
    { group:'Play', icon:'🌐', title:'Public server finder', detail:'Compare sampled Roblox server regions and open slots', url:'/servers/' },
    { group:'Wiki', icon:'📚', title:'BL:R Wiki', detail:'Game knowledge, abilities, progression and mechanics', url:'/' },
    { group:'Wiki', icon:'👥', title:'Style directory', detail:'Search styles, kits and mastery', url:'/styles/' },
    { group:'Wiki', icon:'✦', title:'Flows', detail:'Browse flow profiles', url:'/flows/' },
    { group:'Wiki', icon:'📏', title:'Field Lab', detail:'Measure field distances and visualize ability ranges', url:'/field/' },
    { group:'Wiki', icon:'📅', title:'Patch history', detail:'Documented game changes', url:'/updates/' },
    { group:'Wiki', icon:'🎯', title:'Mastery and counterplay', detail:'Practice, advanced usage and defensive guides', url:'/mastery/' },
    { group:'Play', icon:'⚽', title:'8v8 matches', detail:'Browse public 8v8 servers', url:'/servers/?mode=8v8' },
    { group:'Play', icon:'🏆', title:'Pro servers', detail:'Browse competitive public servers', url:'/servers/?mode=pro' },
    { group:'Play', icon:'🤝', title:'Community customs', detail:'Find player-hosted custom matches', url:'/servers/customs/' },
    { group:'Play', icon:'🤖', title:'Glutony Discord app', detail:'Install BL:R server finder commands in Discord', url:'https://discord.com/oauth2/authorize?client_id=1563907646757666926&integration_type=1&scope=applications.commands' },
    { group:'Rules', icon:'📜', title:'Allowed & banned tech', detail:'Search BL:R styles, techs and punishable bugs', url:'/tech/' },
    { group:'Rules', icon:'🔎', title:'Check if a tech is allowed', detail:'How to ask BL:R support staff about a technique', url:'/tech/#support' },
    { group:'Create', icon:'🎬', title:'Creator Studio', detail:'Compress, trim, analyze and download videos; see method status', url:'https://n29.kz/creator/' },
    { group:'Wiki', icon:'⚽', title:'Replay Studio', detail:'Authorized post-match replay viewer, freecam and ball-follow cameras', url:'/replays/' },
    { group:'Create', icon:'✂️', title:'MP4 clipper', detail:'Trim part of a public direct MP4', url:'https://n29.kz/creator/clipper.html' },
    { group:'Create', icon:'📥', title:'TikTok downloader & repair', detail:'Download and repair MP4 duration metadata', url:'https://n29.kz/creator/tiktok-downloader.html' },
    { group:'Create', icon:'🏅', title:'CC leaderboard (Sep 2026 archive)', detail:'Historical creator event results, not current rankings', url:'/leaderboard/' },
    { group:'Support', icon:'🛡️', title:'Ban appeal help', detail:'Support server and appeals channel for bug-abuse bans', url:'/tech/#support' },
    { group:'Support', icon:'💬', title:'BL:R support server', detail:'Join the official support Discord for tickets and appeals', url:'https://discord.gg/dgV4p83EHA' },
    { group:'Support', icon:'🌍', title:'Main BL:R Discord', detail:'Blue Lock: Rivals community server', url:'https://discord.gg/bluelockrivals' },
  ];

  const indexReady=import('/wiki/content.mjs?v=5').then(({SEARCH_INDEX})=>{
    const known=new Set(links.map(item=>item.url));
    for(const item of SEARCH_INDEX){
      if(known.has(item.url))continue;
      links.push({group:item.kind==='Section'?'Wiki':item.kind==='Style'?'Styles':'Flows',icon:item.kind==='Style'?'◆':item.kind==='Flow'?'✦':'📚',title:item.name,detail:item.kind+' '+(item.aliases||''),url:item.url});
      known.add(item.url);
    }
  }).catch(()=>{});
  const normalize=value=>String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  function findLinks(term){
    const q=normalize(term),tokens=q.split(' ').filter(Boolean);
    const entries=links.filter(item=>item.group!=='Create'||item.title==='Creator Studio'||['tools','clipper','tiktok','leaderboard'].includes(page));
    if(!q)return entries.filter(item=>!['Styles','Flows'].includes(item.group));
    return entries.filter(item=>tokens.every(t=>normalize(item.group+' '+item.title+' '+item.detail).includes(t)))
      .map((item,index)=>({item,index,score:normalize(item.title)===q?0:normalize(item.title).startsWith(q)?1:normalize(item.title).includes(q)?2:3}))
      .sort((a,b)=>a.score-b.score||a.index-b.index).map(x=>x.item);
  }
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
    query.type='search';query.placeholder='Search styles, flows, game information…';
    query.setAttribute('aria-label','Search wiki and pages');
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
      visible=findLinks(term);
      active=0;
      list.replaceChildren();
      if(!visible.length) {
        list.append(createNode('div','site-command-empty','No results. Try a style, flow or wiki section.'));
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
    indexReady.then(()=>{if(dialog.open)render();});
    window.addEventListener('pageshow',event=>{if(event.persisted&&dialog.open)closeDialog();});
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
        const target=visible[active].url;closeDialog();window.location.assign(target);
      }
    });
    dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();else if(event.target.closest?.('.site-command-item')&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey)closeDialog();});
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
      {category:'WIKI',title:'Learn the game',icon:'📚',links:[
        {label:'Style directory',href:'/styles/'},
        {label:'Mastery & counterplay',href:'/mastery/'},
        {label:'Patch history',href:'/updates/'},
        {label:'Core mechanics',href:'/mechanics/'}
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

  // Optional Roblox sign-in is shared across pages; public features work without it.
  function initRobloxAccountNav(){
    const nav=document.querySelector('.n29-nav-inner');
    if(!nav)return;
    const details=createNode('details','n29-account-nav');
    const summary=createNode('summary','n29-account-trigger');
    summary.setAttribute('aria-label','Roblox account options');
    const avatar=createNode('img','n29-account-headshot');
    avatar.alt='';avatar.hidden=true;
    const fallback=createNode('span','n29-account-fallback','◉');
    const label=createNode('span','n29-account-label','Roblox login');
    summary.append(avatar,fallback,label);
    const menu=createNode('div','n29-account-menu');
    menu.setAttribute('aria-label','Roblox account');
    const status=createNode('div','n29-account-status','Optional account · Public browsing remains available');
    const signIn=createNode('a','n29-account-menu-link','Sign in with Roblox');
    signIn.href='/auth/roblox/start';
    const profile=createNode('a','n29-account-menu-link','View Roblox profile ↗');
    profile.hidden=true;profile.target='_blank';profile.rel='noopener noreferrer';
    const signOut=createNode('a','n29-account-menu-link','Sign out');
    signOut.href='/auth/logout';signOut.hidden=true;
    menu.append(status,signIn,profile,signOut);
    details.append(summary,menu);
    nav.append(details);
    document.addEventListener('click',event=>{if(!details.contains(event.target))details.open=false;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')details.open=false;});
    let requested=false;
    function loadAccount(){if(requested)return;requested=true;
    fetch('/api/account/me',{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{if(!response.ok)throw Error('Account API unavailable');return response.json();})
      .then(data=>{
        if(!data.authenticated||!data.profile)return;
        const p=data.profile;
        label.textContent=p.displayName||p.username||'Roblox account';
        status.textContent=p.username?'Signed in as @'+p.username:'Signed in with Roblox';
        signIn.hidden=true;signOut.hidden=false;
        if(typeof p.profileUrl==='string'&&/^https:\/\/www\.roblox\.com\/users\/\d+\/profile$/.test(p.profileUrl)){
          profile.href=p.profileUrl;profile.hidden=false;
        }
        if(typeof p.avatar==='string'&&p.avatar.startsWith('https://')){
          avatar.referrerPolicy='no-referrer';avatar.src=p.avatar;avatar.hidden=false;fallback.hidden=true;
        }
      }).catch(()=>{requested=false;status.textContent='Account currently unavailable · Public browsing still works';});
    }
    details.addEventListener('toggle',()=>{if(details.open)loadAccount();});
    if(['servers','customs'].includes(page))loadAccount();
  }


  // Anonymous, visible-browser presence; one identifier shared by tabs, not a Roblox account.
  function initWebsitePresence(){
    if(location.origin!=='https://blr.n29.kz'||location.pathname.startsWith('/tech/admin/')||location.pathname.startsWith('/auth/'))return;
    const nav=document.querySelector('.n29-nav');
    const links=nav?.querySelector('.n29-nav-links');
    const anchor=nav||document.querySelector('header, main, .wrap')||document.body;
    if(!anchor)return;
    const box=createNode('details','n29-site-presence');
    const style=createNode('style','');
    style.textContent=`
      .n29-site-presence{position:relative;flex:0 0 auto;margin:0;color:#a9bdd1;font:500 11px/1.5 system-ui,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap;z-index:2}
      .n29-site-presence summary{display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;list-style:none;padding:8px 7px;border-radius:8px;min-height:36px;box-sizing:border-box}
      .n29-site-presence summary::-webkit-details-marker{display:none}
      .n29-site-presence summary:hover,.n29-site-presence[open] summary{background:rgba(125,211,252,.08)}
      .n29-site-presence summary:focus-visible{outline:2px solid #92e2ff;outline-offset:2px}
      .n29-site-presence-panel{position:absolute;top:calc(100% + 7px);right:0;min-width:180px;padding:12px;border:1px solid #364455;border-radius:10px;background:#161c26;box-shadow:0 10px 28px rgba(0,0,0,.35);z-index:90}
      .n29-site-presence-panel span{display:block;margin:3px 0}
      .n29-site-presence-panel span[hidden]{display:none}
      .n29-site-presence-panel small{display:block;color:#8696aa;font-size:10px;margin-top:6px}
      @media(max-width:1080px){
        .n29-site-presence{width:100%;border-top:1px solid rgba(160,190,220,.10)}
        .n29-site-presence summary{padding:3px 8px;min-height:26px}
        .n29-site-presence-panel{right:50%;transform:translateX(50%)}
      }
    `;
    document.head.append(style);
    box.setAttribute('aria-label','Website visitor statistics');
    const live=createNode('summary','');
    const dot=createNode('span','','●');
    dot.setAttribute('aria-hidden','true');dot.style.cssText='color:#8592a5;font-size:9px;';
    const online=createNode('strong','','… online');
    online.style.cssText='font-weight:650;color:#a9bdd1;';
    live.append(dot,online);
    const panel=createNode('div','n29-site-presence-panel');
    const today=createNode('span','','');
    const total=createNode('span','','');
    const note=createNode('small','','Daily reset: 00:00 UTC');
    today.hidden=true;total.hidden=true;
    panel.append(today,total,note);
    box.append(live,panel);
    const compact=window.matchMedia('(max-width:1080px)');
    function placePresence(){
      box.open=false;
      if(links&&!compact.matches)links.after(box);
      else if(nav)nav.append(box);
      else anchor.prepend(box);
    }
    placePresence();
    compact.addEventListener('change',placePresence);
    document.addEventListener('click',event=>{if(box.open&&!box.contains(event.target))box.open=false;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&box.open){box.open=false;live.focus();}});
    let id=null;
    try{
      if(navigator.globalPrivacyControl!==true && navigator.doNotTrack!=='1'){
        const key='n29.blr.presence.v1';
        const valid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
        let entry=null;
        try{entry=JSON.parse(localStorage.getItem(key)||'null');}catch{}
        if(!entry||!valid(entry.id)||!Number.isFinite(entry.expires)||entry.expires<=Date.now()){
          entry={id:crypto.randomUUID(),expires:Date.now()+7*86400000};
          localStorage.setItem(key,JSON.stringify(entry));
        }
        id=entry.id;
        window.addEventListener('storage',event=>{
          if(event.key!==key)return;
          try{const next=JSON.parse(event.newValue||'null');id=next&&valid(next.id)&&next.expires>Date.now()?next.id:null;}catch{id=null;}
        });
      }
    }catch{/* Storage disabled: show aggregate counts without counting this browser. */}
    const nf=new Intl.NumberFormat();
    let busy=false,lastRequest=0,timer=null;
    async function refresh(force=false){
      if(document.visibilityState!=='visible'||busy||(!force&&Date.now()-lastRequest<45000))return;
      busy=true;lastRequest=Date.now();
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),8000);
      try{
        const opts={method:id?'POST':'GET',credentials:'omit',cache:'no-store',signal:controller.signal};
        if(id){opts.headers={'Content-Type':'application/json'};opts.body=JSON.stringify({id});}
        const response=await fetch('/api/presence',opts);
        if(!response.ok)throw Error('Presence unavailable');
        const data=await response.json();
        if(![data.online,data.today,data.total].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('Invalid presence data');
        online.textContent=nf.format(data.online)+' online';
        today.textContent=nf.format(data.today)+' visitors today';
        total.textContent=nf.format(data.total)+' total visits';
        dot.style.color='#70d9a1';
        today.hidden=false;total.hidden=false;
        note.textContent='Daily reset: 00:00 UTC';
        online.style.color='#c7f5db';
      }catch{
        online.textContent='Online —';online.style.color='#a9bdd1';dot.style.color='#8592a5';today.hidden=true;total.hidden=true;note.textContent='Visitor statistics unavailable';
      }finally{clearTimeout(timeout);busy=false;}
    }
    const stop=()=>{if(timer!==null){clearInterval(timer);timer=null;}};
    function resume(force=false){
      if(document.visibilityState!=='visible'){stop();return;}
      if(timer===null)timer=setInterval(()=>refresh(),60000);
      refresh(force);
    }
    document.addEventListener('visibilitychange',()=>resume(false));
    window.addEventListener('pagehide',stop);
    window.addEventListener('pageshow',event=>{if(event.persisted)resume(true);});
    resume(true);
  }

  document.querySelectorAll('.site-command-inline kbd').forEach(kbd=>{ kbd.textContent=navigator.platform?.includes('Mac')?'⌘ K':'Ctrl K'; });
  try { if(page!=='replays')initRobloxAccountNav(); } catch(error) { console.warn('Roblox account menu unavailable',error); }
  try { initCommandFinder(); } catch(error) { console.warn('Navigation enhancement unavailable',error); }
  try { initSiteConnections(); } catch(error) { console.warn('Site map enhancement unavailable',error); }
  try { if(page!=='replays'||(document.body.dataset.presence==='enabled'&&!new URLSearchParams(location.search).has('live')&&!new URLSearchParams(location.search).has('room')))initWebsitePresence(); } catch(error) { console.warn('Visitor statistics unavailable',error); }
  if(page==='home') {
    try { initHomeFilters(); } catch(error) { console.warn('Tool filters unavailable',error); }
  }
})();
