import { describe, expect, it, vi } from 'vitest';
import { executeGuideTool, type TourGuide } from './guide-contract';
function fixture(available=true){
 const tour:TourGuide={selectCheckpoint:vi.fn(),onCheckpointRequest:vi.fn(),pauseScene:vi.fn(),resumeScene:vi.fn(),capture:()=>null,focus:vi.fn(),highlight:vi.fn(),demonstrate:vi.fn(),context:()=>({landmark:'Tower Bridge',checkpoint:'construction',chapter:'Construction',viewedPeriod:'1886',viewedDetail:'Foundations',selectedFeature:null,camera:null,target:null,exploring:true,demonstration:null,graphicsAvailable:available})};return tour;
}
describe('live guide scene actions',()=>{
 it('explores features without changing the story checkpoint',async()=>{
  const tour=fixture();expect((await executeGuideTool(tour,'focus_feature','{"feature":"bascules"}')).ok).toBe(true);expect(tour.focus).toHaveBeenCalledWith('bascules');expect(tour.selectCheckpoint).not.toHaveBeenCalled();
 });
 it('rejects unknown tools, geometry, malformed JSON and extra arguments',async()=>{
  const tour=fixture();for(const [name,args] of [['execute_code','{}'],['focus_feature','{"feature":"secret"}'],['focus_feature','{"feature":"bridge","code":"bad"}'],['play_animation','null'],['play_animation','broken'],['continue_tour','{"time":0}'],['visit_checkpoint','{"checkpoint":"hidden"}'],['resume_tour','{}']])expect((await executeGuideTool(tour,name,args)).ok).toBe(false);
  expect(tour.focus).not.toHaveBeenCalled();expect(tour.demonstrate).not.toHaveBeenCalled();
 });
 it('reports graphics failure but allows semantic story navigation',async()=>{
  const tour=fixture(false);expect((await executeGuideTool(tour,'focus_feature','{"feature":"towers"}')).ok).toBe(false);expect(await executeGuideTool(tour,'visit_checkpoint','{"checkpoint":"opening"}')).toEqual({ok:true,checkpoint:'opening'});
 });
 it('lets the voice controller handle continue and pause without a recording',async()=>{
  const tour=fixture();expect(await executeGuideTool(tour,'continue_tour','{}')).toEqual({ok:true,control:'continue'});expect(await executeGuideTool(tour,'pause_tour','{}')).toEqual({ok:true,control:'pause'});
 });
});
