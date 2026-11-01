export type StoryScene = 'silhouette' | 'clock' | 'belfry' | 'setting';

export const storyScenes: { id: StoryScene; label: string; title: string; description: string; sentence: number }[] = [
  { id: 'silhouette', label: 'The silhouette', title: 'You know this silhouette.', description: 'A familiar landmark. A story hiding in plain sight.', sentence: 0 },
  { id: 'belfry', label: 'The bell', title: 'A name you can hear.', description: 'Big Ben is the great bell inside this upper section of the tower.', sentence: 2 },
  { id: 'clock', label: 'The clock', title: 'A face for the whole city.', description: 'Look at the clock face, framed by layers of carved stone.', sentence: 4 },
  { id: 'setting', label: 'The setting', title: 'One more story to take with you.', description: 'Across Parliament Square, Westminster Abbey is waiting.', sentence: 9 },
];

export function sceneForSentence(index: number): StoryScene {
  if (index >= 9) return 'setting';
  if (index >= 4) return 'clock';
  if (index >= 2) return 'belfry';
  return 'silhouette';
}

export function splitStory(paragraphs: string[]) {
  return paragraphs.flatMap(paragraph => paragraph.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [paragraph]).map(sentence => sentence.trim());
}
