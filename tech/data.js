/**
 * BL:R tech / bug rule snapshot, first compiled 2026-11-02.
 * This is a community-maintained directory, NOT an official live moderation feed.
 *
 * TO ADD A VIDEO: find its entry below and add the fifth argument:
 * tech('nagi-delay-trap','Delay Trap','allowed',['Nagi'],'https://www.youtube.com/shorts/VIDEO_ID')
 *
 * Never reclassify unlisted techniques as "allowed". Empty categories mean
 * "No classification documented in this snapshot", not "safe".
 * Base and NEL variants of the same character are displayed as ONE style.
 * Limited/event versions remain separate unless explicitly merged later.
 */
export const POLICY = Object.freeze({
  asOf: '2026-11-02',
  originalFaq: 'https://discord.com/channels/1304535758899777626/1364020867084062752/1559305710930759701',
  techSupportChannelId: '1348650686597955584',
  appealChannelId: '1313206301232463980',
  bugReports: 'https://blox.report/bluelock',
  defaultVideo: ''
});

export const STYLE_GROUPS = [
  {id:'rare',label:'Rare',names:['Isagi','Kurona','Gagamaru','Chigiri','Raichi']},
  {id:'epic',label:'Epic',names:['Otoya','Sendou','Hiori','Bachira','Karasu']},
  {id:'legendary',label:'Legendary',names:['Zantetsu','Kiyora','Nagi','Aiku','King','Kunigami']},
  {id:'mythic',label:'Mythic',names:['Shidou','Ness','Reo','Rin','Niko','Charles','Yukimiya']},
  {id:'world',label:'World Class',names:['Don Lorenzo','Sae','Kaiser']},
  {id:'master',label:'Master',names:['Loki','Snuffy','Lavinho']},
  // Bunny and Igaguri are not placed among the limited/event styles.
  {id:'other',label:'Other',names:['Bunny','Igaguri']},
  {id:'limited',label:'Limited',names:[
    'Easter Kaiser','McNagi Fryshiro','Reaper Sae','Demon Shidou',
    'Phantom Isagi','Bloodmoon Rin','Skeleton Nagi','Elf Emperor',
    'Krampus Barou','Gingerbread Charles','Subzero Loki','Santa Lavinho',
    'Firework Bachira','Easter Yukimiya'
  ]}
];

// "General / Cross-style" covers global mechanics and entries without a
// confirmed single-style attribution. Do not treat them as style-specific.
export const GENERAL = 'General / Cross-style';
export const STYLES = STYLE_GROUPS.flatMap(g => g.names.map(name=>({name,group:g.id,groupLabel:g.label})));
export const ALL_STYLE_NAMES = [GENERAL,...STYLES.map(s=>s.name)];

// NEL kits are the same selectable style as their base character. This also
// normalizes *old* admin overrides saved as "NEL Nagi" before the merge.
// Event/limited prefixes (e.g. "Skeleton Nagi") are deliberately untouched.
export const NEL_VARIANTS = Object.freeze([
  'Rin','Nagi','Isagi','Bachira','Chigiri','Reo','Shidou','King'
]);
export function canonicalStyle(raw){
  if(typeof raw!=='string')return '';
  const name=raw.trim().replace(/\s+/g,' ');
  if(!name)return '';
  if(name===GENERAL)return GENERAL;
  const noNEL=name.replace(/^NEL\s+/i,'');
  // Prefer exact canonical capitalization for roster names.
  const existing=ALL_STYLE_NAMES.find(style=>style.toLowerCase()===noNEL.toLowerCase());
  return existing||noNEL;
}
export function isNELVariant(name){
  return typeof name==='string' && /^NEL\s+/i.test(name.trim());
}

const tech = (id,name,status,styles,video='',note='')=>({id,name,status,styles,video,note});
export const TECHS = [
  // Explicitly ALLOWED, as provided in the moderation FAQ.
  tech('nagi-delay-trap','Delay Trap','allowed',['Nagi']),
  tech('nagi-ground-trap','Ground Trap','allowed',['Nagi']),
  tech('nagi-long-dash','Long Dash','allowed',['Nagi']),
  tech('nagi-lunar-tech','Lunar Tech','allowed',['Nagi']),
  tech('nagi-lunar-trap','Lunar Trap','allowed',['Nagi']),
  tech('nagi-speed-blitz','Speed Blitz','allowed',['Nagi']),
  tech('nagi-high-trap','High Trap','allowed',['Nagi']),
  tech('nagi-high-direct-heel','High Direct Heel','allowed',['Nagi']),
  tech('nagi-d-dash','D-Dash','allowed',['Nagi']),
  tech('nagi-speed-blitz-high-shot','Speed Blitz High Shot','allowed',['Nagi']),
  tech('nagi-rainbow-deception','Rainbow Deception Tech','allowed',['Nagi']),
  tech('nagi-four-volley','4x Volley Tech','allowed',['Nagi']),
  tech('nagi-blindshot','Blindshot Tech','allowed',['Nagi']),
  tech('yuki-street-sweep','Street Sweep (WASD)','allowed',['Yukimiya']),
  tech('yuki-fakeout-gyro','Fakeout Gyro','allowed',['Yukimiya']),
  tech('yuki-laboba','Laboba Fakeout','allowed',['Yukimiya']),
  tech('loki-jump-dash-shot','Loki Jump Dash Shot','allowed',['Loki']),
  tech('m1-insta-power','M1 Insta Power','allowed',[GENERAL]),
  tech('gagamaru-scorpion-kick','Scorpion Kick','allowed',['Gagamaru']),
  tech('shidou-insta-high-shot','Insta High Shot','allowed',['Shidou']),
  tech('sae-rin-accelerated-shot','Accelerated Shot','allowed',['Sae','Rin']),
  tech('rainbowflick-stacking','Rainbowflick Stacking','allowed',[GENERAL]),
  tech('seemless-no-break-dribble','Seemless No-Break Dribble','allowed',[GENERAL]),
  tech('lorenzo-golden-dash','Golden Dash','allowed',['Don Lorenzo']),

  // Explicitly DISALLOWED techs.
  tech('nagi-moonwalk','Moonwalk Tech + variations','disallowed',['Nagi']),
  tech('nagi-tp-trap','TP Trap','disallowed',['Nagi']),
  tech('nagi-dash-tp','Dash TP','disallowed',['Nagi']),
  tech('awk-auto-goal','Auto Goal (awakening)','disallowed',[GENERAL]),
  tech('awk-ball-reoffset','Ball Re-Offset (awakening)','disallowed',[GENERAL]),
  tech('yuki-long-street-sweep','Long Street Sweep (accel)','disallowed',['Yukimiya']),
  tech('lavinho-full-field-dash','Lavinho Full Field Dash','disallowed',['Lavinho']),
  tech('double-shot-volley','Double Shot Volley','disallowed',[GENERAL]),
  tech('reo-cham-tp-minibox','Cham Def/Header TP Minibox','disallowed',['Reo']),
  tech('reo-inf-copy','Infinite Copy (spam)','disallowed',['Reo']),
  tech('helper-dribble','Helper Dribble (backing away)','disallowed',[GENERAL]),
  tech('infinite-juggling-shot','Infinite Juggling Shot','disallowed',[GENERAL]),
  tech('formless-dragon-drive-shot','Formless Dragon Drive Shot','disallowed',[GENERAL]),
  tech('lorenzo-snake-pass','Snake Pass Tech','disallowed',['Don Lorenzo']),
  tech('niko-inf-range-shot','Infinite Range Shot (awakening)','disallowed',['Niko']),
  tech('yuki-street-dribble-gk','Street Dribbling on GK in minibox','disallowed',['Yukimiya']),
  tech('kaiser-curved-impact','Curved Impact Tech','disallowed',['Kaiser']),
  tech('king-full-court-travel','Full-Court Travel','disallowed',['King']),
  tech('nagi-direct-heel-volley-animation','Direct Heel Volley Mid-Animation','disallowed',['Nagi']),

  // Separately listed as examples of PUNISHABLE BUGS.
  tech('side-dive-fling','Side Dive Fling','punishable',[GENERAL]),
  tech('bachira-kaiser-impact','Bachira Aura × Kaiser Impact','punishable',['Bachira','Kaiser']),
  tech('off-ball-awk-save','Off-Ball Awakening Save (player being scored on)','punishable',[GENERAL]),
  tech('kaiser-inf-route','Kaiser Infinite Route','punishable',['Kaiser']),
  tech('awk-tp-cutscene','Awakening TP Abuse (during cutscene)','punishable',[GENERAL]),
  tech('off-ball-awk-after-scoring','Off-Ball Awakening after scoring (before kickoff)','punishable',[GENERAL]),
  tech('kaiser-impact-minibox','Kaiser Impact in Minibox (full-court shot)','punishable',['Kaiser']),
  tech('bunny-gamebreaking','Any Gamebreaking Bunny Bug','punishable',['Bunny']),
  tech('niko-intercept-trap','Intercepting Trap Bug','punishable',['Niko']),
  tech('niko-tactical-one-two','Tactical One-Two infinite range','punishable',['Niko']),
  tech('flow-metavision-unintended','Flow + Metavision move (unintended only)','punishable',[GENERAL]),
  tech('full-field-tp-dash','Any Full Field TP Dash','punishable',[GENERAL]),
  tech('zantetsu-double-explosive','2x Explosive Accel','punishable',['Zantetsu'])
];

export const STATUS = {
  allowed:{name:'Allowed tech',short:'Allowed'},
  disallowed:{name:'Disallowed tech',short:'Disallowed'},
  punishable:{name:'Punishable bug',short:'Punishable'}
};

// Only www.youtube.com, youtube.com, m.youtube.com and youtu.be links accepted.
export function videoUrl(raw){
  if(typeof raw!=='string'||!raw.trim())return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=='https:')return null;
    const host=url.hostname.toLowerCase();
    if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host))return null;
    let id='';
    if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
    else if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
    else if(/^\/(shorts|embed)\/[^/]+/.test(url.pathname))id=url.pathname.split('/')[2];
    if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return null;
    return 'https://www.youtube.com/watch?v='+id;
  }catch{return null;}
}

export function slug(name){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
