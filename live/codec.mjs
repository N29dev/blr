// Synthetic match wire format v1: independent six-frame blocks.
// Only for the fixed fictional 16-player test. No real game input is supported.
// 8-byte header, 51 signed 16-bit coordinates, then five sets of 51 signed 8-bit deltas.
// Coordinates are quantized to 1/64 stud. Every batch starts with an absolute keyframe.
export const HZ=60, BATCH=6, ENTITIES=17, SCALE=64, MAX_BATCHES=6000;
export const BINARY_BYTES=8+ENTITIES*3*2+(BATCH-1)*ENTITIES*3;
const N=ENTITIES*3;
function coordinates(frame){
 if(!frame||!Array.isArray(frame.players)||frame.players.length!==16)throw Error('Invalid synthetic roster');
 const values=[];
 for(let i=0;i<16;i++){
  if(frame.players[i]?.id!==i+1)throw Error('Unexpected synthetic player order');
  values.push(...frame.players[i].cf.slice(0,3));
 }
 values.push(...frame.ball.cf.slice(0,3));
 if(values.length!==N)throw Error('Invalid coordinate count');
 return values.map(v=>{if(!Number.isFinite(v))throw Error('Nonfinite coordinate');const q=Math.round(v*SCALE);if(q<-32768||q>32767)throw Error('Coordinate out of range');return q});
}
export function encodeBatch(seq,frames){
 if(!Number.isInteger(seq)||seq<0||seq>=MAX_BATCHES||frames.length!==BATCH)throw Error('Invalid synthetic batch');
 const out=new ArrayBuffer(BINARY_BYTES),v=new DataView(out);
 v.setUint8(0,0x42);v.setUint8(1,0x4c);v.setUint8(2,1);v.setUint8(3,BATCH);v.setUint32(4,seq,true);
 let offset=8,previous=null;
 for(let i=0;i<BATCH;i++){
  if(Math.abs(frames[i].t-(seq*BATCH+i)/HZ)>1e-8)throw Error('Invalid frame time');
  const cur=coordinates(frames[i]);
  for(let j=0;j<N;j++){
   if(i===0){v.setInt16(offset,cur[j],true);offset+=2}
   else{const d=cur[j]-previous[j];if(d<-128||d>127)throw Error('Delta out of range');v.setInt8(offset++,d)}
  }
  previous=cur;
 }
 return out;
}
export function decodeBatch(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==BINARY_BYTES)throw Error('Invalid binary batch length');
 const v=new DataView(buffer),seq=v.getUint32(4,true);
 if(v.getUint8(0)!==0x42||v.getUint8(1)!==0x4c||v.getUint8(2)!==1||v.getUint8(3)!==BATCH||seq>=MAX_BATCHES)throw Error('Invalid binary header');
 let offset=8;const coords=new Int32Array(N),frames=[];
 for(let i=0;i<BATCH;i++){
  for(let j=0;j<N;j++){
   coords[j]=i===0?v.getInt16(offset,true):coords[j]+v.getInt8(offset);
   offset+=i===0?2:1;
   if(coords[j]<-32768||coords[j]>32767)throw Error('Invalid delta');
  }
  const t=(seq*BATCH+i)/HZ;
  const pos=j=>[coords[j*3]/SCALE,coords[j*3+1]/SCALE,coords[j*3+2]/SCALE];
  const players=Array.from({length:16},(_,j)=>({id:j+1,team:j<8?'Home':'Away',hasBall:false,cf:[...pos(j),0,j<8?Math.PI/2:-Math.PI/2,0]}));
  frames.push({t,players,ball:{state:'free',cf:pos(16)},scoreboard:{home:0,away:0,timer:String(Math.max(0,300-Math.floor(t)))}});
 }
 return {seq,frames};
}
