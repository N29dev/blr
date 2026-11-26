/* Derive offline replay events from the recorded scoreboard, not ball-position guesses. */
function replayScore(value){
 if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0?value:null;
 if(typeof value!=='string'||!/^\d+$/.test(value.trim()))return null;
 const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;
}
function detectReplayGoals(frames){
 const events=[];let previous=null,gap=false;
 for(const f of frames){
  const h=replayScore(f?.scoreboard?.home),a=replayScore(f?.scoreboard?.away);
  if(h===null||a===null||!Number.isFinite(f?.t)){if(previous)gap=true;continue}
  if(previous){
   const dh=h-previous.h,da=a-previous.a;
   if(dh>=0&&da>=0&&(dh||da)){
    const exact=dh+da===1&&!gap;
    events.push({t:f.t,home:h,away:a,team:dh&&da?'Both':dh?'Home':'Away',count:dh+da,exact,clock:typeof f.scoreboard.timer==='string'?f.scoreboard.timer.slice(0,32):'',kind:dh+da===1?'goal':'score-change'});
   }
  }
  previous={h,a};gap=false;
 }
 return events;
}
