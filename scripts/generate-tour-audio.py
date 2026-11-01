"""Generate local narration and measured sentence cues. Requires macOS say and ffmpeg.
Sentence durations are measured from the actual recording, never estimated from word counts.
"""
import json, subprocess, tempfile, pathlib, re
root = pathlib.Path(__file__).resolve().parents[1]
chapters = json.loads((root / 'public/audio/script.json').read_text())
with tempfile.TemporaryDirectory() as temp:
    paths = []
    offset = 0
    for chapter_index, chapter in enumerate(chapters):
        chapter['start'] = round(offset, 3)
        chapter['cues'] = []
        sentences = re.split(r'(?<=[.!?])\s+', chapter['text'])
        for index, sentence in enumerate(sentences):
            stem = pathlib.Path(temp) / f'{chapter_index}-{index}'
            textfile, source, wav = stem.with_suffix('.txt'), stem.with_suffix('.aiff'), stem.with_suffix('.wav')
            textfile.write_text(sentence)
            subprocess.run(['say', '-v', 'Daniel', '-r', '155', '-f', str(textfile), '-o', str(source)], check=True)
            gap = '0.8' if index == len(sentences) - 1 else '0.22'
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af',f'apad=pad_dur={gap}','-ar','44100',str(wav)], check=True)
            seconds = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(wav)]))
            chapter['cues'].append({'text': sentence, 'start': round(offset,3), 'duration':round(seconds,3)})
            offset += seconds
            paths.append(wav)
        chapter['duration'] = round(offset - chapter['start'],3)
    listing = pathlib.Path(temp) / 'concat.txt'
    listing.write_text('\n'.join("file '" + str(p) + "'" for p in paths))
    subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-codec:a','libmp3lame','-q:a','3',str(root/'public/audio/story.mp3')],check=True)
(root/'public/audio/chapters.json').write_text(json.dumps(chapters, indent=2)+'\n')
print(f'Generated {offset:.1f}s of local narration with measured sentence cues.')
