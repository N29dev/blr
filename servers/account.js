(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  const title=el('n29-account-title'),subtitle=el('n29-account-subtitle');
  const login=el('n29-roblox-login'),logout=el('n29-roblox-logout');
  const profileLink=el('n29-roblox-profile'),avatar=el('n29-account-avatar');
  const q=new URLSearchParams(location.search);
  if(q.get('login')==='failed'){
    subtitle.textContent='Roblox sign-in did not complete. You can still browse servers.';
  } else if(q.has('login')) {
    q.delete('login');
    history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash);
  }
  fetch('/api/account/me',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}})
    .then(async r=>{if(!r.ok)throw Error('API '+r.status);return r.json();})
    .then(data=>{
      if(!data.authenticated||!data.profile)return;
      const p=data.profile;
      title.textContent=p.displayName||p.username||'Roblox account';
      subtitle.textContent=p.username?'@'+p.username+' · Connected to Roblox':'Connected to Roblox';
      login.hidden=true;logout.hidden=false;
      if(typeof p.profileUrl==='string' && /^https:\/\/www\.roblox\.com\/users\/\d+\/profile$/.test(p.profileUrl)){
        profileLink.href=p.profileUrl;
        profileLink.hidden=false;
      }
      if(typeof p.avatar==='string' && /^https:\/\//.test(p.avatar)){
        avatar.src=p.avatar;avatar.style.display='block';avatar.referrerPolicy='no-referrer';
      }
    })
    .catch(()=>{if(q.get('login')!=='failed')subtitle.textContent='Sign-in is temporarily unavailable. Public browsing still works.';});
})();
