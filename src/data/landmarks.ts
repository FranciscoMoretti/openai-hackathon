export type Coordinates = { latitude: number; longitude: number };
export type Landmark = {
  id: string; number: number; name: string; coordinates: Coordinates;
  source: { name: string; url: string };
  story: { title: string; intro: string; paragraphs: string[] };
};

export const landmarks: Landmark[] = [
  {
    id: 'big-ben', number: 1, name: 'Big Ben', coordinates: { latitude: 51.50073, longitude: -0.12462 },
    source: { name: 'UK Parliament', url: 'https://www.parliament.uk/about/living-heritage/building/palace/big-ben/building-clock-tower/key-dates-/' },
    story: { title: 'The bell behind the name', intro: 'Look up. That famous name belongs to the bell, not the tower.', paragraphs: [
        'Look up at the clock above Parliament. You probably know it as Big Ben. But that name belongs to the great bell inside. The tower itself is called the Elizabeth Tower.',
        'The clock began ticking in May 1859. The great bell first sounded that July. So the face you can see and the voice you can hear began their working lives a few weeks apart.',
        'Take a moment to look at the clock face and the stonework around it. This familiar silhouette is also a working instrument: a way for a whole city to share the time. When you are ready, there is another story just across Parliament Square, at Westminster Abbey.'
      ] }
  },
  {
    id: 'westminster-abbey', number: 2, name: 'Westminster Abbey', coordinates: { latitude: 51.49960, longitude: -0.12756 },
    source: { name: 'Westminster Abbey', url: 'https://www.westminster-abbey.org/history/coronations-at-the-abbey/a-history-of-coronations' },
    story: { title: 'A thousand years of beginnings', intro: 'A church where a new reign becomes part of a very old story.', paragraphs: [
        'Pause outside Westminster Abbey and look at the entrance. Imagine arriving here for a ceremony that people would remember for centuries.',
        'On Christmas Day in 1066, William the Conqueror was crowned here. Since then, the Abbey has been the setting for the coronations of English, and later British, monarchs. A new ruler arrives, but the place links the ceremony to those who came before.',
        'You do not need to go inside to appreciate that idea. Look at the doors and imagine how many different generations have gathered around them. This is a building that connects individual moments with a much longer history.'
      ] }
  },
  {
    id: 'london-eye', number: 3, name: 'London Eye', coordinates: { latitude: 51.50332, longitude: -0.11963 },
    source: { name: 'London Eye', url: 'https://www.londoneye.com/about-us/' },
    story: { title: 'A new way to see an old city', intro: 'London’s skyline found a new perspective at the turn of the millennium.', paragraphs: [
        'Look across the river at the London Eye. Beside the towers and stone buildings of Westminster, its open circle feels like a very different kind of landmark.',
        'Designed by Marks Barfield Architects, the Eye was launched in 2000. It offered a new way to experience the city: gradually rising above the streets, then returning to the riverside.',
        'From here on the ground, notice how much sky you can see through its structure. Instead of filling the skyline with another solid building, it frames a piece of it. Take a moment to watch the movement before choosing where your own walk goes next.'
      ] }
  },
  {
    id: 'st-james-park', number: 4, name: 'St James’s Park', coordinates: { latitude: 51.50256, longitude: -0.13229 },
    source: { name: 'The Royal Parks', url: 'https://www.royalparks.org.uk/visit/parks/st-jamess-park/pelicans-st-jamess-park' },
    story: { title: 'The park’s unexpected residents', intro: 'Some of London’s oldest traditions come with feathers.', paragraphs: [
        'Walk towards the lake and slow down. Away from the traffic and monuments, St James’s Park has a rather unexpected connection to royal history: pelicans.',
        'In 1664, the Russian ambassador gave a pair to King Charles the Second. Pelicans have been associated with this park ever since. A diplomatic gift became a tradition lasting hundreds of years.',
        'Look towards the water and the rocks. You might spot a pelican resting or swimming, although there is no guarantee. Even without a sighting, the lake is a good place to pause. Not every London story needs a grand building; sometimes it begins with a bird.'
      ] }
  },
  {
    id: 'trafalgar-square', number: 5, name: 'Trafalgar Square', coordinates: { latitude: 51.50795, longitude: -0.12810 },
    source: { name: 'Royal Museums Greenwich', url: 'https://www.rmg.co.uk/stories/maritime-history/nelsons-legacy' },
    story: { title: 'A sailor above the city', intro: 'Look beyond the fountains, all the way to the top of the column.', paragraphs: [
        'In the middle of Trafalgar Square, a figure stands high above the crowds. This is Horatio Nelson, the naval commander remembered for the Battle of Trafalgar in 1805.',
        'His column was completed in November 1843, funded by public subscription. The monument arrived decades after the battle: a later generation deciding how to remember an earlier one.',
        'Now bring your eyes back down to the square. People are meeting, resting and passing through. That contrast is part of the place: a monument built to preserve a memory, surrounded by everyday life. Find a comfortable spot and take it in before your next little wander.'
      ] }
  }
];

export const PREVIEW_LOCATION: Coordinates = { latitude: 51.50098, longitude: -0.12547 };
