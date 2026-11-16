import test from 'node:test';
import assert from 'node:assert/strict';
import {solarDay,isDaylight} from '../solar.js';
import {localValue,timeAt,fromLocal} from '../time.js';
import {locationFor} from '../locations.js';

test('Beijing uses Beijing coordinates, not Shanghai; November sunset is before 18:00',()=>{
 assert.ok(locationFor('Asia/Shanghai')[0]>39);
 const d=new Date('2026-11-16T08:00:00Z'),s=solarDay(d,'Asia/Shanghai');
 assert.equal(s.kind,'normal');assert.equal(timeAt(s.sunrise,'Asia/Shanghai'),'06:59');assert.equal(timeAt(s.sunset,'Asia/Shanghai'),'16:57');
 assert.equal(isDaylight(new Date('2026-11-16T09:30:00Z'),'Asia/Shanghai'),false);
 for(const e of [s.sunrise,s.sunset]){assert.equal(isDaylight(new Date(e.getTime()-2000),'Asia/Shanghai'),e===s.sunset);assert.equal(isDaylight(new Date(e.getTime()+2000),'Asia/Shanghai'),e===s.sunrise);}
});
test('both hemispheres have seasonal day lengths',()=>{
 function length(date,zone){return solarDay(new Date(date),zone).segments.filter(s=>s.period==='day').reduce((n,s)=>n+s.end-s.start,0);}
 assert.ok(length('2026-06-21T12:00Z','Europe/London')>16);
 assert.ok(length('2026-12-21T12:00Z','Europe/London')<9);
 assert.ok(length('2026-12-21T12:00Z','Africa/Johannesburg')>13);
 assert.ok(length('2026-06-21T12:00Z','Africa/Johannesburg')<11);
});
test('polar day and polar night cover the full ring',()=>{
 for(const [date,kind,light]of [['2026-06-21T12:00Z','polar-day',true],['2026-12-21T12:00Z','polar-night',false]]){
  const d=new Date(date),s=solarDay(d,'Arctic/Longyearbyen');assert.equal(s.kind,kind);assert.equal(s.sunrise,null);assert.equal(s.sunset,null);assert.equal(isDaylight(d,'Arctic/Longyearbyen'),light);assert.equal(s.segments[0].end-s.segments[0].start,24);
 }
});
test('civil dates and DST transitions preserve complete, contiguous local rings',()=>{
 for(const [value,zone]of [['2026-03-08T12:00','America/New_York'],['2026-11-01T12:00','America/New_York'],['2026-11-16T01:00','Pacific/Auckland'],['2026-11-15T23:00','Pacific/Honolulu'],['2026-11-16T12:00','Asia/Calcutta']]){
  const d=fromLocal(value,zone),s=solarDay(d,zone);assert.equal(s.kind,'normal');assert.equal(localValue(s.sunrise,zone).slice(0,10),value.slice(0,10));assert.equal(localValue(s.sunset,zone).slice(0,10),value.slice(0,10));assert.equal(s.segments[0].start,0);assert.equal(s.segments.at(-1).end,24);
  for(let i=1;i<s.segments.length;i++)assert.equal(s.segments[i].start,s.segments[i-1].end);
 }
});
test('UTC has no geographic day/night; missing coordinates never imply night',()=>{
 const d=new Date('2026-11-16T12:00Z');assert.equal(solarDay(d,'UTC').kind,'unknown');assert.equal(isDaylight(d,'UTC'),null);
});
