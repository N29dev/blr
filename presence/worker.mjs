// BL:R anonymous presence. D1 binding: PRESENCE_DB (blr-presence).
// Route: blr.n29.kz/api/presence. No Roblox APIs or account data are used.
// Schema setup: presence/schema.sql
const ORIGIN='https://blr.n29.kz';
const WINDOW_MS=150000;
const MIN_WRITE_MS=45000;
const DAY_MS=86400000;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dayAt=n=>new Date(n).toISOString().slice(0,10);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/presence')return json({error:'not_found'},404);
  if(!['GET','POST'].includes(request.method))return json({error:'method_not_allowed'},405);
  const now=Date.now(),day=dayAt(now),db=env.PRESENCE_DB;
  if(!db)return json({error:'unavailable'},503);
  const statements=[];
  if(request.method==='POST'){
   if(request.headers.get('Origin')!==ORIGIN)return json({error:'forbidden'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'invalid_content_type'},415);
   if(Number(request.headers.get('Content-Length')||0)>128)return json({error:'too_large'},413);
   let id;
   try{
    const reader=request.body?.getReader();
    if(!reader)return json({error:'invalid_body'},400);
    const decoder=new TextDecoder();let body='',size=0;
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>128){await reader.cancel();return json({error:'too_large'},413);}body+=decoder.decode(value,{stream:true});}
    body+=decoder.decode();id=JSON.parse(body).id;
   }catch{return json({error:'invalid_body'},400);}
   if(typeof id!=='string'||!ID.test(id))return json({error:'invalid_id'},400);
   statements.push(db.prepare('DELETE FROM presence_visitors WHERE day < ?').bind(dayAt(now-DAY_MS)));
   statements.push(db.prepare('INSERT INTO presence_visitors(day,visitor_id,last_seen) VALUES(?,?,?) ON CONFLICT(day,visitor_id) DO UPDATE SET last_seen=excluded.last_seen WHERE presence_visitors.last_seen<=?').bind(day,id.toLowerCase(),now,now-MIN_WRITE_MS));
  }
  statements.push(db.prepare('SELECT COUNT(DISTINCT visitor_id) AS online FROM presence_visitors WHERE last_seen>=?').bind(now-WINDOW_MS));
  statements.push(db.prepare('SELECT COALESCE(SUM(CASE WHEN day=? THEN visitors ELSE 0 END),0) AS today, COALESCE(SUM(visitors),0) AS total FROM presence_daily').bind(day));
  try{
   const results=await db.batch(statements);
   const online=results.at(-2).results[0].online;
   const {today,total}=results.at(-1).results[0];
   return json({online,today,total,windowSeconds:WINDOW_MS/1000,day,updatedAt:new Date(now).toISOString()});
  }catch(error){console.error('Presence database unavailable',error?.message);return json({error:'unavailable'},503);}
 }
};