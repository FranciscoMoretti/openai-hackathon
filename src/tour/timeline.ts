import chapterData from '../../public/audio/chapters.json';
export const chapters = chapterData;
export const duration = chapters.at(-1)!.start + chapters.at(-1)!.duration;
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const smooth = (a: number, b: number, value: number) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };
export function chapterAt(time: number) { return chapters.reduce((active, c, i) => time >= c.start ? i : active, 0); }

/** Visual demonstration clock only. Legacy cue positions stage the geometry; live speech and checkpoint progress are independent. */
export function sceneAt(seconds: number) {
  const time = clamp(Number.isFinite(seconds) ? seconds : 0, 0, duration);
  const chapter = chapterAt(time), c = chapters[chapter], p = clamp((time - c.start) / c.duration);
  const cue = (i: number) => c.cues[i].start;
  let stone=1, steel=1, foundations=1, deck=1, walkways=1, blue=1, lift=0, ship=0, electric=1, machinery=false, era='Today', period='The bridge you see now';
  if (chapter === 0) {
    const disappearing = 1 - smooth(cue(1), cue(2), time);
    stone=disappearing; steel=0; foundations=disappearing; deck=disappearing>.85?1:0; walkways=deck;
    blue=1-smooth(cue(1),cue(2),time); era=time<cue(1)?'Today':'Before 1886';
    if(time>=cue(2))era='1876';period=era==='Today'?'The bridge you see now':'A river without this crossing';
    ship=-.6+p*.4;electric=0;
  } else if (chapter === 1) {
    foundations=smooth(cue(1),cue(3),time);steel=smooth(cue(3),cue(4),time);stone=smooth(cue(4),cue(5),time);
    walkways=smooth(cue(5),cue(6),time);deck=smooth(cue(6),cue(7),time);blue=0;ship=-.5;electric=0;
    era=time<cue(3)?'1886':'1886–1894';period=time<cue(3)?'Foundations & piers':time<cue(4)?'The steel framework':time<cue(5)?'Stone over steel':'Walkways & roadway';
  } else if (chapter === 2) {
    blue=0;electric=0;era='1894';period='A bridge built to open';
    lift=smooth(cue(1),cue(3),time)*(1-smooth(cue(7),c.start+c.duration,time));
    ship=-.8+smooth(cue(4)-1,cue(6)+.7,time)*1.6;
  } else {
    machinery=time<cue(3);electric=time>=(cue(1)+cue(2))/2?1:0;blue=smooth(cue(3),cue(4),time);ship=.8+p*.5;
    era=time<cue(3)?'1976':time<cue(4)?'1977':'Today';period=time<cue(3)?'Steam gives way to electricity':time<cue(4)?'A new colour scheme':'The bridge you see now';
  }
  return {time,chapter,progress:p,stone,steel,foundations,deck,walkways,blue,lift,ship,electric,machinery,era,period};
}
export type SceneState = ReturnType<typeof sceneAt>;
export const poses = [
  {position:[162,102,220],target:[0,19,0],fov:40},
  {position:[112,78,167],target:[0,27,0],fov:42},
  {position:[88,54,153],target:[0,24,0],fov:44},
  {position:[125,112,270],target:[0,12,0],fov:40},
];
export function cameraAt(time: number) {
  const index=chapterAt(time),to=poses[index],from=poses[Math.max(0,index-1)];
  const blend=index===0?1:smooth(chapters[index].start,chapters[index].start+3.4,time);
  return {position:to.position.map((n,i)=>from.position[i]+(n-from.position[i])*blend),target:to.target.map((n,i)=>from.target[i]+(n-from.target[i])*blend),fov:from.fov+(to.fov-from.fov)*blend};
}

/** Reduced motion uses discrete, dated milestones rather than continuous movement. */
export function stillAt(time:number):SceneState {
 const s=sceneAt(time), c=chapters[s.chapter];
 if(s.chapter===0){const present=time<c.cues[1].start;return {...s,stone:+present,foundations:+present,steel:0,deck:+present,walkways:+present,ship:-.6};}
 if(s.chapter===1)return {...s,foundations:1,steel:time>=c.cues[3].start?1:0,stone:time>=c.cues[4].start?1:0,walkways:time>=c.cues[5].start?1:0,deck:time>=c.cues[6].start?1:0};
 if(s.chapter===2)return {...s,lift:time>=c.cues[1].start&&time<c.cues[7].start?1:0,ship:time<c.cues[5].start?-.8:.8};
 return {...s,blue:time>=c.cues[3].start?1:0};
}
