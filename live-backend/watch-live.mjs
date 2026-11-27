// Watches a dedicated opt-in folder, not a game installation or general replay directory.
// A trusted, authorized source/operator creates <session>.start after opening
// <session>.ndjson. A <session>.stop marker ends publishing independently.
import {mkdir,readdir,lstat,rename,unlink} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const script=join(dirname(fileURLToPath(import.meta.url)),'local-publisher.mjs');
const dir=resolve(process.argv[2]||join(homedir(),'BLR-Live'));
const delay=Number(process.argv.find(a=>a.startsWith('--delay='))?.split('=')[1]??3);
const validName=name=>/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.start$/.test(name);
if(process.argv.includes('--self-test')){
 if(!validName('match-123.start')||validName('../match.start')||validName('x.ndjson')||validName('.start'))throw Error('Marker validation failed');
 console.log('Folder marker self-test passed');
}else{
 if(!process.argv.includes('--consent'))throw Error('Usage: node watch-live.mjs ~/BLR-Live --consent [--delay=3]');
 if(!Number.isFinite(delay)||delay<1||delay>10)throw Error('Delay must be 1–10 seconds');
 if(!process.env.LIVE_DEMO_TOKEN||process.env.LIVE_DEMO_TOKEN.length<32)throw Error('Set LIVE_DEMO_TOKEN in the local shell first');
 await mkdir(dir,{recursive:true,mode:0o700});
 const folder=await lstat(dir);
 if(!folder.isDirectory()||folder.isSymbolicLink()||(process.getuid&&folder.uid!==process.getuid())||(folder.mode&0o077)!==0)throw Error('Use a private directory you own (chmod 700)');
 const boot=Date.now();let active=null,running=true;
 const stop=()=>{running=false;if(active&&!active.stopping){active.stopping=true;active.child.kill('SIGTERM')}};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 const regular=async path=>{try{const st=await lstat(path);return st.isFile()&&!st.isSymbolicLink()&&(!process.getuid||st.uid===process.getuid())?st:null}catch(e){if(e.code==='ENOENT')return null;throw e}};
 console.log('Watching '+dir+' for fresh *.start markers. One stream at a time. Ctrl+C exits.');
 try{
  while(running){
   if(active){
    const stopPath=join(dir,active.name+'.stop');
    if(!active.stopping&&await regular(stopPath)){
     active.stopping=true;active.child.kill('SIGTERM');await unlink(stopPath).catch(()=>{});
    }
   }else{
    for(const marker of (await readdir(dir)).filter(validName).sort()){
     const startPath=join(dir,marker),st=await regular(startPath);
     if(!st||st.mtimeMs<boot||Date.now()-st.mtimeMs>30000)continue;
     const name=marker.slice(0,-6),data=join(dir,name+'.ndjson'),claimed=join(dir,name+'.claimed');
     if(!await regular(data))continue;
     if(await regular(claimed)||await regular(join(dir,name+'.stop')))continue;
     // Consume the explicit marker; never repeatedly rebroadcast a finished file.
     await rename(startPath,claimed);
     const child=spawn(process.execPath,[script,data,'--consent','--delay='+delay],{stdio:['ignore','inherit','inherit']});
     const state={name,child,stopping:false,done:null};active=state;
     state.done=new Promise(resolve=>{
      child.once('error',err=>{console.error('Publisher failed: '+err.message);resolve()});
      child.once('close',(code,signal)=>{console.log('Session '+name+' ended ('+(signal||code)+')');resolve()});
     }).then(()=>{if(active===state)active=null});
     console.log('Starting authorized session '+name);
     break;
    }
   }
   await sleep(250);
  }
 }finally{
  if(active){const state=active;if(!state.stopping)state.child.kill('SIGTERM');await state.done}
 }
 console.log('Watcher stopped. Recording files were preserved.');
}
