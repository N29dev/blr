/* N29 BL:R — shared progressive motion inspired by N29 portfolio.
 * Decorates only: never intercepts links, changes game data, or blocks content.
 * Offscreen-only reveals prevent white flashes and inaccessible invisible cards.
 */
(() => {
  'use strict';
  const root=document.documentElement;
  const body=document.body;
  if(!body)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const finePointer=window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

  const progress=document.createElement('div');
  progress.className='n29-scroll-progress';
  progress.setAttribute('aria-hidden','true');
  body.prepend(progress);
  const nav=document.querySelector('.n29-nav');
  let scrollFrame=0;
  let scrollProgress=0;

  function updateScroll() {
    scrollFrame=0;
    const max=Math.max(0,root.scrollHeight-window.innerHeight);
    const current=Math.max(0,root.scrollTop||window.scrollY||0);
    scrollProgress=max>0?Math.max(0,Math.min(1,current/max)):1;
    progress.style.transform='scaleX('+scrollProgress.toFixed(4)+')';
    if(nav)nav.classList.toggle('n29-scrolled',current>14);
    if(story)updateStory(current);
  }
  function requestScroll() {
    if(!scrollFrame)scrollFrame=window.requestAnimationFrame(updateScroll);
  }
  window.addEventListener('scroll',requestScroll,{passive:true});
  window.addEventListener('resize',requestScroll,{passive:true});

  const chapters=(() => {
    const path=window.location.pathname;
    if(path==='/')return [
      ['top','Intro'],['play','Play'],['stats','Profile'],['tools','Create'],['discord','Community']
    ];
    if(path==='/tech/')return [
      ['support','Appeals'],['rules','Rules'],['directory','Styles'],['tech-list','Techs'],['faq','FAQ']
    ];
    if(path==='/tools/')return [
      ['top','Studio'],['patch-tool','Patch'],['analyze-tool','TikTok'],['compress-tool','Compress']
    ];
    return [];
  })().filter(([id])=>document.getElementById(id));
  const story=chapters.length>=3?createStory(chapters):null;
  let activeChapter='';
  function createStory(items){
    const aside=document.createElement('nav');
    aside.className='n29-story-rail';
    aside.setAttribute('aria-label','On this page');
    const title=document.createElement('span');
    title.className='n29-story-label';
    title.textContent='ON THIS PAGE';
    aside.append(title);
    for(const [id,label] of items){
      const a=document.createElement('a');
      a.href='#'+id;
      const idx=document.createElement('span');
      idx.textContent=String(items.indexOf(items.find(([key])=>key===id))+1).padStart(2,'0');
      a.append(idx,document.createTextNode(label));
      aside.append(a);
    }
    const track=document.createElement('div');
    track.className='n29-story-progress';
    const fill=document.createElement('span');
    track.append(fill);
    aside.append(track);
    body.append(aside);
    return {aside,fill,links:[...aside.querySelectorAll('a')]};
  }
  function updateStory(){
    if(!story)return;
    const marker=Math.min(window.innerHeight*.4,300);
    let current=chapters[0][0];
    for(const [id] of chapters){
      if(document.getElementById(id)?.getBoundingClientRect().top<=marker)current=id;
    }
    if(activeChapter!==current){
      activeChapter=current;
      for(const link of story.links){
        if(link.getAttribute('href')==='#'+current)link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      }
    }
    story.fill.style.transform='scaleX('+scrollProgress.toFixed(4)+')';
  }

  if(!reduced){
    // Only currently visible hero elements get an entrance; everything else
    // either uses intersection reveal below or remains visibly rendered.
    const entrance=document.querySelectorAll(
      '.site-hero-copy,.site-hero-panel,.n29-page-hero,header.hero .hero-copy,header.hero .hero-side,.support-spotlight'
    );
    let enterIndex=0;
    for(const el of entrance){
      if(el.getBoundingClientRect().top<window.innerHeight-20){
        enterIndex++;
        el.classList.add('n29-hero-enter');
        el.dataset.n29Enter=String(Math.min(3,enterIndex));
      }
    }
  }

  const revealSelector=[
    '.site-route-card','.n29-teaser-grid > a','.site-connect',
    '.site-connect-card','.metric','.tool-card','.section-heading',
    '.faq-grid','.report-card','.style-group','.tech-entry',
    '.site-hero-panel','.site-hero-copy','.n29-page-hero',
    '.matchday-quickstart','.finder-overline',
    '.admin-toolbar'
  ].join(',');
  const glowSelector=[
    '.site-route-card','.n29-teaser-grid > a','.site-connect-card',
    '.style-tile','.tech-entry','.tool-card','.report-card'
  ].join(',');
  const decorated=new WeakSet();
  const revealed=new WeakSet();
  let revealObserver=null;
  if(!reduced&&'IntersectionObserver' in window){
    revealObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        const el=entry.target;
        el.classList.add('n29-revealed');
        revealObserver.unobserve(el);
      }
    },{rootMargin:'0px 0px -35px 0px',threshold:.03});
  }

  function prepare(el){
    if(!(el instanceof Element)||decorated.has(el))return;
    decorated.add(el);
    if(el.matches(glowSelector)&&finePointer){
      el.classList.add('n29-glow');
    }
    if(!revealObserver||!el.matches(revealSelector))return;
    if(el.closest('dialog,[hidden]'))return;
    const rect=el.getBoundingClientRect();
    if(rect.height<3||rect.width<3||rect.top<=window.innerHeight-45)return;
    // The content remains visible until this offscreen check succeeds.
    el.style.setProperty('--n29-reveal-delay',Math.min(140,([...el.parentElement.children].indexOf(el)%4)*48)+'ms');
    el.classList.add('n29-will-reveal');
    revealObserver.observe(el);
    revealed.add(el);
  }
  function scan(parent){
    if(!(parent instanceof Element))return;
    if(parent.matches(revealSelector)||parent.matches(glowSelector))prepare(parent);
    parent.querySelectorAll(revealSelector+','+glowSelector).forEach(prepare);
  }
  scan(body);

  // New technique cards are created after the module fetch, and the site map
  // is inserted by site-experience.js. Observe only those small containers.
  // Don't constantly recreate observers when the Roblox server list refreshes.
  const dynamicParents=['#style-grid','#tech-entries','[data-site-connect]'];
  if('MutationObserver' in window){
    for(const selector of dynamicParents){
      const container=document.querySelector(selector);
      if(!container)continue;
      const mo=new MutationObserver(records=>{
        for(const record of records){
          for(const node of record.addedNodes)scan(node);
        }
        requestScroll();
      });
      mo.observe(container,{childList:true,subtree:true});
    }
  }
  if(finePointer){
    let target=null,localX=0,localY=0,hoverFrame=0;
    document.addEventListener('pointermove',event=>{
      const candidate=event.target instanceof Element?event.target.closest('.n29-glow'):null;
      if(!candidate)return;
      const rect=candidate.getBoundingClientRect();
      target=candidate;
      localX=Math.max(0,Math.min(rect.width,event.clientX-rect.left));
      localY=Math.max(0,Math.min(rect.height,event.clientY-rect.top));
      if(hoverFrame)return;
      hoverFrame=window.requestAnimationFrame(()=>{
        if(target?.isConnected){
          target.style.setProperty('--n29-glow-x',localX+'px');
          target.style.setProperty('--n29-glow-y',localY+'px');
        }
        hoverFrame=0;
      });
    },{passive:true});
  }

  requestScroll();
})();
