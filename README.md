# Synthetic Speech Sim

A browser performance featuring Morrow and a choir of anatomical wireframe heads. Procedural vocal-fold excitation, vocal-tract resonances, and shaped airflow generate the simulated voices.

The current version includes blue wireframe heads, visible red internals, round wireframe eyeballs, individual accessories, anatomy views, scroll zoom, and staged performances of Rammstein's “Mutter” and “Seemann” with timed lyrics and hand gestures. Choose a performance under **Controls → Repertoire**.

“Seemann” opens by default. Its sea setting includes illuminated water, storm passages, lantern light and reflections, a reaching gesture, and a fading cold ending. The stage analyses the decoded backing waveform in approximately 20 ms windows. Measured loudness and musical attacks drive the hologram tearing, wireframe dropouts, displaced image bands, and erratic head movements, including loud backing beneath the refrains. Glitch strength is halved during vocal passages for a more restrained performance. Loud instrumental peaks make Morrow grip both sides of his head. His hands lower slowly as the intensity drops or vocals return, while the distortion continues to follow the backing. Softer passages settle naturally. The effect follows the audio playback clock through pauses and seeking. Anatomy views and the reduced-motion setting present a steady head throughout.

The score uses both vocal tracks and lyric timings from the supplied MIDI. Five isolated octave outliers are corrected, and the verses are lowered by an octave for Morrow's baritone register. The final word carries across two MIDI notes to preserve the four “kalt” repetitions in the supplied text. The backing is rendered from the instrumental MIDI tracks.

Under **Controls → Speak**, enter text, choose a singer, and select **Simulated English** or **Simulated German**. Speaking speed ranges from **0.5× to 2×** and applies when you press **Speak**. Locally installed system voices are also available as separate choices. The simulated voices have a stylized sound and approximate pronunciation.

## Run

Download or clone the repository and open `index.html` in a current Chrome or Edge browser. Press **Play** or **Speak** to enable audio. The HTML includes its assets and pronunciation data and runs offline.

## Build

Use Node.js 22 or newer and run the following from the repository folder.

```sh
npm run build
```

The build uses Node's standard library and requires no package installation. It generates the intermediate performances in `outputs/` and writes the current performance to `index.html`.

## Source

- `work/build.cjs` assembles the original modular browser application.
- `work/build-morrow-full.cjs` adds the German performance engine.
- `work/build-morrow-mutter.cjs` assembles the current anatomy, cast, scene, and speech controls.
- `work/build-seemann.cjs` adds Seemann alongside Mutter and makes it the opening performance.
- `work/seemann-score.cjs` maps the supplied lyrics and phonemes to the MIDI vocal tracks.
- `work/seemann-stage.js` and `work/seemann-stage.css` provide the sea setting and timed acting.
- `work/seemann-energy.js` measures backing intensity and derives the glitch and hand-motion curves.
- `work/mutter-speech.js` handles speech playback, voice selection, and speed.
- `work/mutter-speech-phrasing.js` handles pronunciation, timing, stress, and intonation.
- `work/mutter-phonation.js` models vocal-fold excitation and articulation.
- The remaining tracked files in `work/` provide geometry, shaders, styling, performance timing, and build inputs.

## Credits

English pronunciation data comes from the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict). Its license is retained in `work/cmudict-LICENSE.txt` and embedded in the standalone HTML.

The Rammstein performances use user-supplied lyrics and MIDI-derived arrangements. Song compositions and lyrics belong to their respective rights holders.

The Seemann MIDI metadata credits Biorn for the transcription. The supplied file is retained in `work/seemann-source.mid` alongside the parsed build input.
