import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ActionSchedule} from '../src/client/action-schedule'
const base={phase:'reading' as const,turn:1,working:true,outcome:'none',playing:true,delta:0}
test('rapid tools retain a readable pose and then switch only to the newest phase',()=>{
 const schedule=new ActionSchedule();assert.equal(schedule.advance(base),'reading')
 assert.equal(schedule.advance({...base,phase:'testing',delta:.1}),'reading')
 assert.equal(schedule.advance({...base,phase:'building',delta:.15}),'reading')
 assert.equal(schedule.advance({...base,phase:'git',delta:.24}),'reading')
 assert.equal(schedule.advance({...base,phase:'agents',delta:.01}),'agents')
})
test('new turns, outcomes, cancellation and manual action selection interrupt a queued pose',()=>{
 for(const override of [{turn:2},{outcome:'failed'},{outcome:'success'},{working:false},{immediate:true}]){
  const schedule=new ActionSchedule();schedule.advance(base)
  assert.equal(schedule.advance({...base,phase:'building',...override}),'building')
 }
})
test('paused playback does not consume the minimum pose duration or replay obsolete phases',()=>{
 const schedule=new ActionSchedule();schedule.advance(base)
 assert.equal(schedule.advance({...base,phase:'git',delta:10,playing:false}),'reading')
 assert.equal(schedule.advance({...base,delta:.25}),'reading')
 assert.equal(schedule.advance({...base,phase:'editing',delta:.25}),'editing')
})
