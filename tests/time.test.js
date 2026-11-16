import test from 'node:test';
import assert from 'node:assert/strict';
import {timeAt,offsetAt,dayDifference,fromLocal,localValue,utcLabel} from '../time.js';
test('Beijing 16:00 is Johannesburg 10:00 and Mexico City 02:00',()=>{
 const d=new Date('2026-11-16T08:00:00Z');
 assert.equal(timeAt(d,'Asia/Shanghai'),'16:00');assert.equal(timeAt(d,'Africa/Johannesburg'),'10:00');assert.equal(timeAt(d,'America/Mexico_City'),'02:00');
 assert.equal(offsetAt(d,'Africa/Johannesburg')-offsetAt(d,'Asia/Shanghai'),-360);
});
test('date boundaries and quarter-hour offsets',()=>{
 const d=new Date('2026-11-16T00:00:00Z');assert.equal(dayDifference(d,'America/Mexico_City','Asia/Shanghai'),-1);
 assert.equal(timeAt(d,'Asia/Kathmandu'),'05:45');assert.equal(utcLabel(d,'Asia/Kathmandu'),'UTC+5:45');
 assert.equal(timeAt(d,'Asia/Kolkata'),'05:30');assert.equal(timeAt(d,'UTC'),'00:00');
});
test('DST is date specific',()=>{
 assert.equal(offsetAt(new Date('2026-07-01T12:00:00Z'),'America/New_York'),-240);
 assert.equal(offsetAt(new Date('2026-12-01T12:00:00Z'),'America/New_York'),-300);
 assert.equal(offsetAt(new Date('2026-07-01T12:00:00Z'),'Australia/Sydney'),600);
 assert.equal(offsetAt(new Date('2026-12-01T12:00:00Z'),'Australia/Sydney'),660);
});
test('local time entry rejects DST gaps and resolves folds to earlier instant',()=>{
 assert.equal(fromLocal('2026-03-08T02:30','America/New_York'),null);
 assert.equal(fromLocal('2026-11-01T01:30','America/New_York').toISOString(),'2026-11-01T05:30:00.000Z');
 assert.equal(fromLocal('2026-11-16T16:00','Asia/Shanghai').toISOString(),'2026-11-16T08:00:00.000Z');
 assert.equal(localValue(fromLocal('2026-11-16T05:45','Asia/Kathmandu'),'Asia/Kathmandu'),'2026-11-16T05:45');
 assert.equal(fromLocal('bad','UTC'),null);
});
