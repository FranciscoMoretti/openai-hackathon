import { describe,expect,it } from 'vitest';
import { DemonstrationPlayback } from './demonstration-playback';
import { chapters,sceneAt } from './timeline';
const build=()=>new DemonstrationPlayback('construction',chapters[1].cues[1].start,chapters[1].start+chapters[1].duration-.05,1000);
describe('construction playback',()=>{
 it('visibly builds immediately, raises towers within five seconds and finishes in twelve',()=>{
  const clock=build();expect(sceneAt(clock.time(1000)).stone).toBe(0);
  expect(sceneAt(clock.time(1500)).foundations).toBeGreaterThan(0);
  expect(sceneAt(clock.time(6000)).steel).toBeGreaterThan(.9);
  const end=sceneAt(clock.time(13000));expect(end.stone).toBe(1);expect(end.walkways).toBe(1);expect(end.deck).toBe(1);
 });
 it('freezes during an interruption and resumes from the same frame without losing the build',()=>{
  const clock=build();clock.pause(4000);const paused=clock.time(4000);
  expect(clock.time(30000)).toBe(paused);clock.resume(30000);expect(clock.time(30000)).toBe(paused);
  expect(clock.time(31000)).toBeGreaterThan(paused);expect(sceneAt(clock.time(39000)).deck).toBe(1);
 });
});
