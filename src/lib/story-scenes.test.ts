import { describe, expect, it } from 'vitest';
import { landmarks } from '../data/landmarks';
import { sceneForSentence, splitStory, storyScenes } from './story-scenes';

describe('Big Ben narrative camera cues', () => {
  const sentences = splitStory(landmarks.find(place => place.id === 'big-ben')!.story.paragraphs);
  it('frames the details named in the actual script, including the final invitation', () => {
    const expected = [
      ['silhouette', 'Look up at the clock'],
      ['belfry', 'that name belongs to the great bell'],
      ['clock', 'The clock began ticking'],
      ['setting', 'When you are ready'],
    ];
    for (const [id, text] of expected) {
      const cue = storyScenes.find(scene => scene.id === id)!;
      expect(sentences[cue.sentence]).toContain(text);
      expect(sceneForSentence(cue.sentence)).toBe(id);
    }
  });
  it('retains every word while splitting paragraphs for device narration', () => {
    const paragraphs = landmarks[0].story.paragraphs;
    expect(sentences.join(' ')).toBe(paragraphs.join(' '));
    expect(sentences.every(sentence => sentence.length > 0)).toBe(true);
  });
});
