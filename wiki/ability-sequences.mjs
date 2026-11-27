import {createSequenceView} from './sequence-view.mjs?v=1';
import {previewControls,bindPreviewPlayback} from './preview-playback.mjs?v=1';
// Independent, schematic client-event diagrams. Positions and step lengths are illustrative,
// not measurements or reconstructed server hitboxes. No game code is included.
const groups={
 'intercept-redirect':'1475 3256 3361 7080 13185 14444 17970 46836 50103 9813',
 'intercept-pass':'12876 14647 21731 24208 34842 35764 50357 40136 40363',
 'intercept-shot':'1057 14762 6618 11962 48338 48531 48805 13536 47878 32311 33810 40027 40049 6530 44234',
 'intercept-control':'29390 36788 26858 36017 46569 49920 49466',
 'steal':'456 491 1022 1178 3490 22022 23232 25067 26584 35549 36040 36188 37974 38013 38746 39683 40991 42451 44015 49431 10664 11493 38580 8836 5429 24925 6910',
 'counter':'27325 24354 15523 15614 15359 15229 18421 18784 19112 19455 21217 24964 25563 25413 39086 43424 46598 49945 51170 51354 52806',
 'targeted-pass':'4004 6320 7423 7510 10022 10861 12666 13852 14098 14857 15106 15705 22184 26292 26929 34372 34487 34612 40866 41104 45664 38812 39441 50193 38422 6773 53007',
 'forced-pass':'18630 19299',
 'steal-pass':'24566 50516',
 'shot':'8253 3817 5200 5360 5464 5854 6074 8456 8999 9249 9369 11310 11686 11724 11898 12517 13814 15939 16068 16636 16769 16791 18183 18948 19614 19706 20061 21045 21617 22978 23394 23641 23907 25003 25541 25676 25973 27720 28827 31862 31951 32223 32395 32565 32798 37471 37661 38270 38941 39383 40081 41229 41645 41882 42537 45783 45927 46172 46496 47043 47095 47972 48069 48126 49720 49786 51285 51705 51818 52893 53129 33833 33896 33723 25436 7778',
 'movement':'3728 4753 4830 4916 5052 5269 5542 5634 5745 5994 6195 7312 7700 7731 7800 7909 8073 8207 8334 9173 10201 10567 11389 11762 12132 12349 13997 14239 14979 16193 17038 17735 22462 22646 22822 23456 23736 23818 24082 25176 26181 27501 27557 27804 28147 28622 33269 33478 34188 34740 37728 37890 38080 38162 40206 40511 40718 42002 42111 42807 43012 43450 43737 43823 43909 46003 46240 46333 47184 48199 49497 49970 51066 51922 52075 52452 53188 22098 39600',
 'trap':'11176 32669 34053 49600',
 'buff':'3074 3425 17456 23561 25283 36875 50760',
 'combo':'525 37258 24023 26125 26650 36392 46627 52634',
 'dash-shot':'33975',
 'cutscene-request':'3890 3928 3966 8658 10335 10824 12277 12311 13776 16614 21431 21459 23371 23619 27931 28033 35943 37231 37286 40113 40174 41435 42192 45965 45179 50990 51028 52401 6442 9535 32087 41674 33855',
 'request':'4888 18341 18389 18755 19039 19083 19423 32055 27286 9332 7149 9930 12590 35507 38337 39178 42754 40637 13452'
};
const index=new Map();
for(const [kind,ids] of Object.entries(groups))for(const id of ids.split(' '))index.set(+id,kind);
const namedNagi={'Trap':33533,'Trap Shot':33533,'Dash':33478,'Skull Trap':34053,'Breakdance Shot':33896,'Zero Reset Turn':34188,'Direct Heel Lift':33975,'I Am Nagi':33723,'Effortless Miracle':33810,'Five Stage Volley':33833,'Two Stage Volley':33855};
const titles={'intercept-redirect':'Interception / redirect','intercept-pass':'Interception / receiver response','intercept-shot':'Ball acquisition / release','intercept-control':'Interception / control','steal':'Defensive interaction','counter':'Conditional interaction','targeted-pass':'Pass / ball transfer','forced-pass':'Forced teammate pass','steal-pass':'Defensive interaction / pass','shot':'Ball release','movement':'Movement / dribble','trap':'Trap / possession','buff':'Temporary state','combo':'Multi-stage ability','dash-shot':'Movement / shot','cutscene-request':'Target or cutscene request','request':'Client request / unresolved result'};
const specific={
 29390:['Jump → interception response → land → Explosive Acceleration. The transition is conditional on the success state.','jump','catch','land','dash'],
 1475:['Aerial forward movement, then the server response supplies a ball velocity. No guaranteed pickup.','jump','contact','redirect'],
 3256:['Body-local left or right selects the deflection animation; success triggers the hit animation.','side','contact','redirect'],
 3361:['Off-ball request; the shared shot handler waits for a response. Do not depict this as an ordinary possession shot.','contact','redirect'],
 3490:['Off-ball grounded clearance targets an opponent; movement and target interaction are distinct.','dash','duel','result'],
 1178:['Forced Defense includes different possession and target-dependent paths. The client can request ForcePass; its server result is not fully reconstructed.','duel','request','result'],
 14444:['Jump and hitbox-start request, then a response supplies the outgoing velocity.','jump','contact','redirect'],
 17970:['Off-ball grounded jump, hitbox-start request, then a response supplies a new ball velocity.','jump','contact','redirect'],
 21731:['Jump → ball contact response → receiver-directed flight; landing is a separate event.','jump','contact','pass','land'],
 14647:['Loose aerial ball requirement, then target request and guided receiver flight on response.','contact','pass'],
 14762:['Grounded loose-ball requirement, then response launches the ball.','contact','release'],
 12876:['Loose aerial ball, then response-controlled receiver pass; not a normal on-ball shot.','contact','pass'],
 18630:['Teammate is the ball origin; Kaiser is the receiver.','force','receive'],
 19299:['Teammate is the ball origin; Kaiser is the receiver.','force','receive'],
 18421:['Off-ball route requests enemy interaction; success can unlock Subjugation. Failure does not unlock the follow-up.','dash','duel','follow'],
 18784:['On-ball route requests enemy interaction; success can unlock Impact.','dash','duel','follow'],
 19112:['Awakened off-ball route may unlock Subjugation.','dash','duel','follow'],
 19455:['Awakened on-ball route may unlock Impact.','dash','duel','follow'],
 18948:['Impact is the separate release branch, not part of every route activation. See the fixed-elevation flight component.','release'],
 19614:['Awakened Impact is a separate release branch.','release'],
 24566:['On-ball: pass; off-ball: steal request, then pass only if possession and follow-up conditions are met.','duel','acquire','pass','receive'],
 50516:['World-Class Core has a dash request and a teammate-pass request. The pass may be forced from a ball holder; branch selection matters.','duel','force','receive'],
 50357:['Off-ball airborne Rational Interception; guided ball flight is response-dependent.','jump','contact','pass'],
 50103:['Off-ball Rational Defense: response applies server-supplied ball velocity.','contact','redirect'],
 50193:['On-ball Rational Defense: choose eligible teammate and pass after response.','pass','receive'],
 24354:['Backspin shot can branch to a counter shot or guided receiver pass. These are distinct responses, not successive guaranteed shots.','request','duel','result'],
 6618:['Rabbit Trap has Start and Hit requests before its launch response.','request','contact','release'],
 27557:['Rising Dance lifts the ball and sets the Butterfly Dribble follow-up flag.','lift','follow'],
 27804:['Ginga Style tracks stages and target interactions; Ginga Shot is a separate follow-up.','duel','follow'],
 28622:['Velocity Dash can unlock the separate Velocity Shot state.','dash','follow'],
 33975:['Movement precedes the launch branch. Use the detailed flight preview for the release only.','dash','release'],
 33269:['Three movement phases are consecutive, not three independent ability activations. Direction is a scenario here.','dash','side','dash'],
 34188:['Mastery II: initial forward target followed by curved steering. This diagram is schematic; the separate mathematical steering preview contains the resolved target formula.','dash','side'],
 52634:['Awakened B uses server-acknowledged stages. Two stages precede the final shot request. No unverified shot path is drawn.','dash','dash','request'],
 53188:['Off-ball initial acceleration; a possession-dependent second activation is separate.','dash','follow'],
 46627:['Tiki-Taka state and Decoy Striker follow-up depend on possession and teammates.','pass','receive','follow'],
 26292:['One-Two has an outgoing pass and a return branch, not a single shot.','pass','force','receive'],
 27325:['Butterfly Counter requests Start, then Dash; the client toggles its temporary protection flag.','request','duel','dash'],
 51354:['Godspeed Freeze has a Hit request followed by conditional pass or shot velocity. The outgoing branch is not predetermined.','contact','result'],
 48531:['On-ball shot and off-ball aerial interception are different branches. Choose the initial possession below.','jump','contact','release'],
 48338:['Off-ball jump/interception request; a successful response can release the ball.','jump','contact','release'],
 48805:['Grounded off-ball jump/interception request; the shot is response-dependent.','jump','contact','release'],
 6910:['Off-ball: an eligible opponent must hold the ball within activation range; excludes a goalkeeper in the penalty area. A cutscene request follows. Server result is unresolved.','duel','request','result'],
 40637:['Copy selects another ability; its execution depends on what was copied.','request','follow'],
 7149:['Dartboard Lens sends a separate on-ball request. Server-side effect is unresolved.','request','result'],
 13452:['Instincts Reaction is a goalkeeper diving-direction request, not a generic shot.','side','request','result'],
 9535:['Death of a Striker has multiple server response paths; its launch is a defensive/cutscene component, not an unconditional shot.','duel','request','result'],
 33855:['Off-ball opponent-target volley; a successful response may release the ball.','duel','release'],
 32311:['Off-ball awakened volley checks possession and target before release.','duel','release'],
 33810:['Effortless Miracle requires a loose aerial ball before the cutscene request.','contact','request','release'],
 6773:['Rabona Cross uses a curved ball launch. Receiver and cutscene details are separate from the launch model.','pass'],
 6442:['Enter Striker checks a teammate holding the ball; response releases the ball.','force','release'],
 27501:['Butterfly Dribble is a follow-up, not an independent opening shot.','dash'],
 32087:['Death Dance uses a cutscene response; the full acquisition and release sequence remains unresolved.','request','result'],
 41674:['Two Steps Behind checks an enemy and possession before a guided ball response.','duel','request','result'],
 3425:['Snake Vision enables and later disables a client state.','enable','hold','disable'],
 3074:['Serpentine Radar enables and later disables its state.','enable','hold','disable'],
 25283:['Predator Krampus enables and later disables its state; do not draw a projectile.','enable','hold','disable'],
 50760:['Tactical Vision has explicit Enable and Disable requests.','enable','hold','disable'],
 17456:['Omnivision enables its state, which can end on possession change or cleanup.','enable','hold','disable']
};
const defaults={
 'intercept-redirect':['contact','redirect'],'intercept-pass':['contact','pass'],'intercept-shot':['contact','release'],'intercept-control':['contact','catch'],
 'steal':['duel','result'],'counter':['duel','result'],'targeted-pass':['pass','receive'],'forced-pass':['force','receive'],'steal-pass':['duel','acquire','pass'],
 'shot':['release'],'movement':['dash'],'trap':['contact','catch','follow'],'buff':['enable','hold','disable'],'combo':['request','follow','result'],
 'dash-shot':['dash','release'],'cutscene-request':['request','result'],'request':['request','result']
};
const stageText={dash:'Movement / ability animation',side:'Directional movement',jump:'Aerial movement',contact:'Ball interaction / response gate',duel:'Target interaction / response gate',acquire:'Possession acquired (success scenario)',catch:'Ball control (success scenario)',land:'Land / complete movement',redirect:'Outgoing ball response',pass:'Pass response toward receiver',force:'Teammate-to-player pass response',receive:'Receiver contact (illustrative)',release:'Ball release response',follow:'Follow-up becomes available if accepted',request:'Client request',result:'Server result not fully established',enable:'Enable temporary state',hold:'State active',disable:'Disable / cleanup',lift:'Ball lift'};
export function abilitySequenceInfo(id,name){
 const sid=id??namedNagi[name],regularTrap=id==null&&name==='Trap',regularShot=id==null&&name==='Trap Shot',kind=regularTrap?'trap':regularShot?'shot':index.get(sid)||'request',sp=regularTrap?['Regular Nagi AirDribble implementation: trap acquisition, with an on-ball lift branch and separate Trap Shot follow-up.','contact','catch','follow']:regularShot?['Regular Nagi AirDribble implementation: trapped state and possession precede release.','release']:specific[sid];
 return {sid,kind,title:titles[kind],note:sp?.[0]||'This is a schematic interpretation of the client branch. The exact server result and hitbox are not verified.',steps:sp?sp.slice(1):defaults[kind]};
}
const el=(t,s)=>{const n=document.createElement(t);if(s!=null)n.textContent=s;return n;};
const mix=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u),clamp=x=>Math.max(0,Math.min(1,x));
export function renderAbilitySequence({name,implementation=null,selection=[],branchLabel=''}){
 const info=abilitySequenceInfo(implementation?.source?.from,name),root=el('details');root.className='am-box ability-sequence';root.append(el('summary','Ability sequence · '+info.title+(branchLabel?' · '+branchLabel:'')));let initialized=false;
 root.addEventListener('toggle',()=>{if(!root.open||initialized)return;initialized=true;
  const wrap=el('div');wrap.style.cssText='display:grid;gap:8px';root.append(wrap,el('p','Perspective gameplay illustration — positions, heights, playback timing and interaction radius are illustrative, not measured game physics. Exact numerical models remain separate.'));
  const intro=el('p',info.note);wrap.append(intro);
  const cond=el('p',selection.length?selection.join(' / '):'See the activation conditions in this ability card.');cond.style.cssText='font-size:.8rem;color:#b8cbe0';wrap.append(cond);
  const scenario=el('div');scenario.style.cssText='display:flex;gap:10px;flex-wrap:wrap;align-items:center';wrap.append(scenario);
  function select(label,items){const l=el('label',label+' '),s=el('select');s.style.cssText='max-width:100%;background:#152334;color:inherit;padding:5px';for(const [v,t] of items){const o=el('option',t);o.value=v;s.append(o);}l.append(s);scenario.append(l);return s;}
  const outcome=select('Response',[['success','Accepted / illustrative success'],['failure','Rejected / no follow-up']]);
  const gates=info.steps.some(s=>['contact','duel','catch','force','pass','release','request','follow'].includes(s));
  outcome.disabled=!gates;
  const possession=select('Starting ball',[['auto','Ability context'],['player','Player'],['loose','Loose / incoming'],['enemy','Opponent'],['team','Teammate']]);
  const direction=select('Movement direction',[['1','Forward / right'],['-1','Mirrored']]);
  const camera=select('Camera',[['tactical','Tactical'],['side','Low angle'],['goal','Goal view']]);const view=createSequenceView();wrap.append(view.canvas);camera.addEventListener('change',()=>view.setCamera(camera.value));
  const stage=el('p');stage.setAttribute('role','status');stage.style.cssText='font-weight:600;min-height:1.4em';wrap.append(stage);
  const ctrl=previewControls(),range=el('input');range.type='range';range.min='0';range.step='0.01';range.setAttribute('aria-label','Ability stage progress');range.style.cssText='width:100%;accent-color:#70c5ff';wrap.append(ctrl.bar,range);
  const list=el('div');list.style.cssText='display:flex;flex-wrap:wrap;gap:5px';wrap.append(list);
  let t=0;
  function steps(){let q=info.steps.slice();if(info.sid===33533&&name==='Trap'&&possession.value==='player')q=['lift','catch','follow'];if(info.sid===24566&&possession.value==='player')q=['pass','receive'];if(info.sid===48531&&possession.value==='player')q=['release'];return q;}
  const durations={dash:.62,side:.55,jump:.55,land:.42,contact:.68,duel:.65,catch:.4,acquire:.4,redirect:.9,pass:1.05,force:1.05,receive:.28,release:.95,follow:.45,request:.55,result:.6,enable:.35,hold:.9,disable:.35,lift:.6};
  const duration=q=>q.reduce((sum,k)=>sum+(durations[k]||.6),0);
  const eased=u=>u*u*(3-2*u),arc=u=>4*u*(1-u),gate=k=>['contact','duel','request','pass','force','release','lift','catch','acquire','follow'].includes(k);
  function initial(q){const owner=possession.value==='auto'?(q[0]==='force'?'team':q.includes('duel')?'enemy':q.includes('contact')||q.includes('jump')?'loose':'player'):possession.value;
   const p=[105,127,0],e=[216,95,0],mate=[315,70,0],b=owner==='team'?[325,70,3.6]:owner==='enemy'?[206,95,3.6]:owner==='loose'?[35,64,12]:[116,127,3.6];
   return {p,b,owner,e,mate,yaw:0};
  }
  function state(start,k,u,failed){const s={...start,p:start.p.slice(),b:start.b.slice()},sign=Number(direction.value),p=start.p,b=start.b,v=eased(u);
   const move=(dx,dz,y=0)=>[Math.max(18,Math.min(402,p[0]+dx)),Math.max(18,Math.min(197,p[1]+dz)),y];
   if(['dash','side','jump','land'].includes(k)){
    const dest=k==='side'?move(28,sign*36):k==='jump'?move(36,-12,18):k==='land'?move(8,0,0):move(62,sign*6);
    s.p=mix(p,dest,k==='dash'?1-(1-u)**2:v);if(k==='jump')s.p[2]=p[2]+(dest[2]-p[2])*Math.sin(u*Math.PI/2);
    s.yaw=k==='land'?start.yaw:Math.atan2(dest[1]-p[1],dest[0]-p[0]);if(s.owner==='player')s.b=[s.p[0]+Math.cos(s.yaw)*10,s.p[1]+Math.sin(s.yaw)*10,s.p[2]+3.6];
   }
   if(k==='contact'){
    // Incoming ball must travel to the interaction area before the outcome, not teleport.
    const dest=failed?[330,35,3.6]:[p[0]+12,p[1],Math.max(3.6,p[2]+12)];s.b=mix(b,dest,u);s.b[2]+=arc(u)*12;s.owner='loose';
   }
   if(k==='duel'){const dest=[start.e[0]-15,start.e[1]+8,0];s.p=mix(p,dest,v);s.yaw=Math.atan2(dest[1]-p[1],dest[0]-p[0]);if(s.owner==='player')s.b=[s.p[0]+10,s.p[1],3.6];}
   if((k==='catch'||k==='acquire')&&!failed){s.b=mix(b,[p[0]+10,p[1],p[2]+3.6],v);if(u>=1)s.owner='player';}
   if(['pass','release','redirect','force'].includes(k)&&!failed){
    const end=k==='pass'?[start.mate[0]-9,start.mate[1],3.6]:k==='force'?[p[0]+10,p[1],p[2]+3.6]:k==='redirect'?[335,45,3.6]:[403,107,6.5];
    s.b=mix(b,end,u);s.b[2]+=arc(u)*(k==='release'?22:k==='redirect'?13:9);s.owner=k==='force'&&u>=1?'player':'loose';
   }
   if(k==='receive'&&!failed&&s.owner!=='player')s.owner='receiver';
   if(k==='lift'&&!failed){s.b=[p[0]+10,p[1],3.6+arc(u*.65)*23];s.owner='loose';}
   return s;
  }
  function sample(q,time,failed){let rem=time,s=initial(q),idx=q.length-1,u=1,stopped=false,k=q[idx];
   for(let i=0;i<q.length;i++){k=q[i];const len=durations[k]||.6;idx=i;u=clamp(rem/len);if(stopped)break;s=state(s,k,u,failed);if(rem<len)break;if(failed&&gate(k)){stopped=true;break;}rem-=len;}
   return {s,idx,u,k,stopped};
  }
  let lastLabel='';
  function draw(value){const q=steps(),total=duration(q);t=Math.max(0,Math.min(total,value));range.max=total;range.value=t;const failed=outcome.value==='failure',f=sample(q,t,failed),{s,idx,u,k,stopped}=f;
   const people=[{role:'player',label:'Player',pos:s.p,yaw:s.yaw,moving:!stopped&&['dash','side','duel','jump'].includes(k),stride:t*16}];
   if(q.includes('duel')||possession.value==='enemy')people.push({role:'enemy',label:'Opponent',pos:s.e,yaw:Math.PI});
   if(q.includes('pass')||q.includes('force')||possession.value==='team')people.push({role:'team',label:'Teammate',pos:s.mate,yaw:Math.PI});
   const trail=[],playerTrail=[];for(let n=0;n<=16;n++){const at=Math.max(0,t-Math.min(.55,t)+(n/16)*Math.min(.55,t));const prev=sample(q,at,failed).s;if(s.owner==='loose'&&['contact','redirect','release','force','pass','lift'].includes(k))trail.push(prev.b);if(['dash','side','duel','jump'].includes(k))playerTrail.push(prev.p);}
   view.render({people,ball:s.b,stage:k,u,stopped,trail,playerTrail});
   const label=stopped?'Response rejected — subsequent stages not executed':(idx+1)+' / '+q.length+' · '+stageText[k]+(failed&&gates?' · rejection scenario':'');
   if(label!==lastLabel){lastLabel=label;stage.textContent=label;list.replaceChildren();q.forEach((step,i)=>{const v=el('span',String(i+1)+'. '+stageText[step]);v.style.cssText='font-size:.72rem;border-radius:5px;padding:5px 7px;background:'+(i===idx?'#34516b':'#1b2a37')+';color:#e5eff9';list.append(v);});}
  }
  const playback=bindPreviewPlayback({...ctrl,host:ctrl.bar,duration:()=>duration(steps()),read:()=>t,render:draw});range.addEventListener('input',()=>{playback.pause();draw(+range.value);});for(const s of [outcome,possession,direction])s.addEventListener('change',()=>{playback.pause();draw(0);});draw(0);
 });return root;
}
