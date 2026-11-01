"""Regenerate local Mac Daniel placeholder voice; no OpenAI credentials required."""
import json, subprocess, tempfile, pathlib
root=pathlib.Path(__file__).resolve().parent
chapters=json.loads((root/'public/audio/script.json').read_text())
with tempfile.TemporaryDirectory() as d:
    paths=[]; offset=0
    for i,c in enumerate(chapters):
        p=pathlib.Path(d)/f'{i}.aiff'; textfile=pathlib.Path(d)/f'{i}.txt'
        textfile.write_text(c['text'])
        subprocess.run(['say','-v','Daniel','-r','155','-f',str(textfile),'-o',str(p)],check=True)
        wav=pathlib.Path(d)/f'{i}.wav'
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-af','apad=pad_dur=1.0','-ar','44100',str(wav)],check=True)
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(wav)]))
        c['start']=round(offset,3); c['duration']=round(duration,3); offset+=duration; paths.append(wav)
    listing=pathlib.Path(d)/'concat.txt'; listing.write_text('\n'.join("file '"+str(p)+"'" for p in paths))
    subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-codec:a','libmp3lame','-q:a','3',str(root/'public/audio/story.mp3')],check=True)
(root/'public/audio/chapters.json').write_text(json.dumps(chapters,indent=2)+'\n')
print(f'Generated {offset:.1f}s of local placeholder narration.')
