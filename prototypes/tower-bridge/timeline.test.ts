import { describe, expect, it } from 'vitest';
import { chapters, duration, sceneAt, stillAt, chapterAt, cameraAt } from './timeline';

describe('continuous narrated journey', () => {
 it('covers the recording with consecutive chapters and measured sentence cues', () => {
   expect(chapters[0].start).toBe(0);
   chapters.forEach((c,i)=>{
     if(i)expect(Math.abs(c.start-chapters[i-1].start-chapters[i-1].duration)).toBeLessThan(.002);
     expect(c.cues[0].start).toBe(c.start);
     expect(c.cues.map(x=>x.text).join(' ')).toBe(c.text);
     expect(Math.abs(c.cues.at(-1)!.start+c.cues.at(-1)!.duration-c.start-c.duration)).toBeLessThan(.002);
   });
   expect(chapterAt(duration)).toBe(3);
 });
 it('keeps the road fully open while any part of the ship is crossing it', () => {
   const c=chapters[2];let crossingSamples=0;
   for(let t=c.start;t<c.start+c.duration;t+=.02){const s=sceneAt(t);if(Math.abs(s.ship*110)<32){expect(s.lift).toBeGreaterThan(.98);crossingSamples++;}}
   expect(crossingSamples).toBeGreaterThan(20);
 });
 it('shows foundations before steel, steel before cladding, and walkways before roadway', () => {
   const c=chapters[1];
   const foundations=sceneAt(c.cues[3].start-.05);expect(foundations.foundations).toBeGreaterThan(.99);expect(foundations.steel).toBe(0);
   const steel=sceneAt(c.cues[4].start);expect(steel.steel).toBe(1);expect(steel.stone).toBe(0);
   const stone=sceneAt(c.cues[5].start);expect(stone.stone).toBe(1);expect(stone.deck).toBe(0);
   const walkway=sceneAt(c.cues[6].start);expect(walkway.walkways).toBe(1);expect(walkway.deck).toBe(0);
 });
 it('keeps the power change in 1976 and the colour change in 1977', () => {
   const c=chapters[3];
   const steam=sceneAt(c.start);expect(steam.era).toBe('1976');expect(steam.electric).toBe(0);expect(steam.machinery).toBe(true);
   const electric=sceneAt(c.cues[2].start);expect(electric.electric).toBe(1);expect(electric.blue).toBe(0);expect(electric.era).toBe('1976');
   const paint=sceneAt(c.cues[3].start+2);expect(paint.era).toBe('1977');expect(paint.blue).toBeGreaterThan(0);expect(paint.machinery).toBe(false);
   const today=sceneAt(c.cues[4].start);expect(today.blue).toBe(1);expect(today.era).toBe('Today');
 });
 it('restores the exact same scene when seeking backwards or replaying', () => {
   const order=[0,29,61,77,83,92,29,0,61];const snapshots=new Map<number,ReturnType<typeof sceneAt>>();
   order.forEach(t=>{if(snapshots.has(t))expect(sceneAt(t)).toEqual(snapshots.get(t));else snapshots.set(t,sceneAt(t));});
   expect(sceneAt(-20)).toEqual(sceneAt(0));expect(sceneAt(Number.NaN)).toEqual(sceneAt(0));
 });
 it('offers discrete reduced-motion scenes with the same period as narration', () => {
   for(let t=0;t<duration;t+=.1){const s=stillAt(t);expect(s.era).toBe(sceneAt(t).era);for(const n of [s.stone,s.steel,s.deck,s.walkways,s.electric,s.blue,s.lift])expect(Number.isFinite(n)).toBe(true);}
   expect(stillAt(72).electric).toBe(0);expect(stillAt(77).electric).toBe(1);expect(stillAt(81).blue).toBe(1);
 });
 it('keeps guided camera transitions continuous at checkpoints', () => {
   for(const c of chapters.slice(1)){const a=cameraAt(c.start-.0001),b=cameraAt(c.start);a.position.forEach((n,i)=>expect(Math.abs(n-b.position[i])).toBeLessThan(.01));}
 });
});
