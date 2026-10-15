import type {Phase} from '../engine/library'

/** Show ordinary work for at least half a cycle. Keep only the latest pending
 * activity; outcomes, a new turn and manual previews interrupt immediately. */
export class ActionSchedule {
 private phase?:Phase
 private turn?:number
 private age=0
 private pending?:Phase
 advance(input:{phase:Phase;turn:number;working:boolean;outcome:string;delta:number;playing:boolean;immediate?:boolean}):Phase{
  const {phase,turn,working,outcome,playing,immediate}=input
  if(this.phase===undefined||turn!==this.turn||!working||outcome!=='none'||immediate){
   this.phase=phase;this.turn=turn;this.age=0;this.pending=undefined;return phase
  }
  if(playing)this.age+=Math.max(0,Math.min(.25,Number.isFinite(input.delta)?input.delta:0))*1000
  this.pending=phase===this.phase?undefined:phase
  if(this.pending&&this.age>=500){this.phase=this.pending;this.pending=undefined;this.age=0}
  return this.phase
 }
}
