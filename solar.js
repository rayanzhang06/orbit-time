import {getTimes} from './vendor/suncalc.js';
import {partsAt,localValue,offsetAt,fromLocal} from './time.js';
import {locationFor} from './locations.js';

const cache=new Map();
const dayKey=(date,zone)=>localValue(date,zone).slice(0,10);
export function hourAt(date,zone){const p=partsAt(date,zone);return p.hour+p.minute/60+p.second/3600;}

// Build a local civil day's light intervals from astronomical events. Nearby
// windows cover DST changes and places whose civil date differs from solar date.
export function solarDay(date,zone){
 const point=locationFor(zone);
 if(!point)return {kind:'unknown',segments:[],sunrise:null,sunset:null};
 const key=dayKey(date,zone),cacheKey=zone+'|'+key;
 if(cache.has(cacheKey))return cache.get(cacheKey);
 const noon=fromLocal(key+'T12:00',zone);
 if(!noon)return {kind:'unknown',segments:[],sunrise:null,sunset:null};
 const events=new Map();let central;
 for(const shift of [-2,-1,0,1,2]){
  const anchor=new Date(noon.getTime()+shift*86400000);
  const times=getTimes(anchor,point[0],point[1],0,offsetAt(anchor,zone));
  if(shift===0)central=times;
  for(const type of ['sunrise','sunset']){
   const event=times[type];
   if(event&&Number.isFinite(event.getTime())&&dayKey(event,zone)===key)events.set(type+'|'+Math.round(event.getTime()/1000),{type,date:event,hour:hourAt(event,zone)});
  }
 }
 const ordered=[...events.values()].sort((a,b)=>a.hour-b.hour);
 let day=ordered.length?ordered[0].type==='sunset':!!central.alwaysUp;
 const segments=[];let start=0;
 for(const e of ordered){if(e.hour>start)segments.push({start,end:e.hour,period:day?'day':'night'});day=e.type==='sunrise';start=e.hour;}
 if(start<24)segments.push({start,end:24,period:day?'day':'night'});
 const result={kind:ordered.length?'normal':day?'polar-day':'polar-night',segments,sunrise:ordered.find(e=>e.type==='sunrise')?.date||null,sunset:ordered.find(e=>e.type==='sunset')?.date||null};
 if(cache.size>300)cache.clear();cache.set(cacheKey,result);return result;
}
export function isDaylight(date,zone,solar=solarDay(date,zone)){
 if(solar.kind==='unknown')return null;
 const h=hourAt(date,zone);return solar.segments.some(s=>s.period==='day'&&h>=s.start&&h<s.end);
}
