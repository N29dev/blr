/* Offline converter controls; no upload or account required. */
(()=>{
 const $=id=>document.getElementById(id),input=$('liteFiles'),start=$('liteConvert'),cancel=$('liteCancel'),result=$('liteResult'),status=$('liteStatus'),bar=$('liteProgress'),download=$('liteDownload');
 let worker=null,url=null;
 const fmt=n=>n>=1048576?(n/1048576).toFixed(2)+' MiB':(n/1024).toFixed(1)+' KiB';
 function clear(){if(url)URL.revokeObjectURL(url);url=null;result.hidden=true;download.removeAttribute('href');}
 function setBusy(b){input.disabled=b;$('liteRate').disabled=b;$('liteNpc').disabled=b;start.disabled=b||!input.files.length;cancel.hidden=!b;bar.hidden=!b;}
 function stop(message){worker?.terminate();worker=null;setBusy(false);status.textContent=message;}
 input.addEventListener('change',()=>{clear();setBusy(false);status.textContent=input.files.length?input.files.length+' file(s) selected · '+fmt([...input.files].reduce((s,f)=>s+f.size,0)):'Choose your original replay.';});
 start.addEventListener('click',()=>{
  if(!input.files.length||worker)return;clear();bar.value=0;setBusy(true);status.textContent='Reading replay…';
  try{worker=new Worker('/replays/lite-worker.js?v=5');}catch(e){stop('Converter unavailable: '+e.message);return;}
  worker.onmessage=({data:r})=>{
   if(r.type==='progress'){bar.value=Math.max(0,Math.min(1,r.fraction));status.textContent=r.message;return;}
   if(r.type==='error'){stop('Conversion failed: '+r.message);return;}
   if(r.type!=='done')return;
   url=URL.createObjectURL(r.blob);const name=input.files.length===1?input.files[0].name.replace(/\.(zip|json)$/i,''):'matches';download.href=url;download.download=name+'_lite.zip';
   $('liteBefore').textContent=fmt(r.inputRaw);$('liteAfter').textContent=fmt(r.outputRaw);$('liteFrames').textContent=r.oldFrames.toLocaleString()+' → '+r.frames.toLocaleString();$('liteZipSize').textContent=fmt(r.blob.size);
   const percent=r.inputRaw?(100*(1-r.outputRaw/r.inputRaw)).toFixed(1):'0';
   $('liteSummary').textContent=percent+'% less uncompressed JSON · '+r.discarded.toLocaleString()+' action events removed · '+r.removed.toLocaleString()+' parked AI samples removed.'+(r.overLimit?' Output still exceeds the viewer limit; try a lower recording rate or split the match.':' Ready to import into Replay Studio.');
   result.hidden=false;stop('Conversion complete · '+r.matchCount+' match'+(r.matchCount===1?'':'es')+'. Your original files were not changed.');
  };
  worker.onerror=e=>{stop('Converter failed to load or run: '+(e.message||'unknown error'));};
  worker.postMessage({files:[...input.files],options:{fps:Number($('liteRate').value),removeNpc:$('liteNpc').checked}});
 });
 cancel.addEventListener('click',()=>stop('Conversion cancelled. Original files unchanged.'));
 window.addEventListener('pagehide',()=>{worker?.terminate();if(url)URL.revokeObjectURL(url);});
 setBusy(false);
})();
