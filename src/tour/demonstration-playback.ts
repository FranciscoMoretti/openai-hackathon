import type { Demonstration } from './guide-contract';

/** Scene time survives voice interruptions; construction fits the short opening. */
export class DemonstrationPlayback {
  private pausedAt?:number;
  constructor(readonly name:Demonstration,readonly start:number,readonly end:number,private began:number){}
  time(now:number){
    const seconds=((this.pausedAt??now)-this.began)/1000;
    const rate=this.name==='construction'?(this.end-this.start)/12:1;
    return Math.min(this.end,this.start+seconds*rate);
  }
  get paused(){return this.pausedAt!==undefined;}
  pause(now:number){this.pausedAt??=now;}
  resume(now:number){if(this.pausedAt!==undefined){this.began+=now-this.pausedAt;this.pausedAt=undefined;}}
}
