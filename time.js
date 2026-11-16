// All conversions use the date-specific IANA offset, never a fixed UTC offset.
export function partsAt(date, zone) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
}
export const pad = n => String(n).padStart(2,'0');
export function timeAt(date,zone){const p=partsAt(date,zone);return `${pad(p.hour)}:${pad(p.minute)}`;}
export function localValue(date,zone){const p=partsAt(date,zone);return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;}
export function offsetAt(date,zone){const p=partsAt(date,zone);return (Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(date.getTime()/1000)*1000)/60000;}
export function utcLabel(date,zone){const n=offsetAt(date,zone);return `UTC${n<0?'−':'+'}${Math.floor(Math.abs(n)/60)}${Math.abs(n)%60?':'+pad(Math.abs(n)%60):''}`;}
export function dayDifference(date,zone,base){const a=partsAt(date,zone),b=partsAt(date,base);return Math.round((Date.UTC(a.year,a.month-1,a.day)-Date.UTC(b.year,b.month-1,b.day))/86400000);}
export function differenceLabel(minutes){if(!minutes)return '与本地同一时间';const n=Math.abs(minutes);return `${minutes>0?'快':'慢'} ${Math.floor(n/60)?Math.floor(n/60)+' 小时':''}${n%60?' '+n%60+' 分钟':''}`;}
// Try every plausible offset near the requested date. DST folds resolve to the
// earlier occurrence; DST gaps are rejected rather than silently shifted.
export function fromLocal(value,zone){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
  const target=Date.parse(value+'Z');if(!Number.isFinite(target))return null;
  const offsets=new Set([-36,-12,0,12,36].map(h=>offsetAt(new Date(target+h*3600000),zone)));
  const candidates=[...offsets].map(o=>new Date(target-o*60000)).filter(d=>localValue(d,zone)===value).sort((a,b)=>a-b);
  return candidates[0]||null;
}
