# Synthetic Speech Sim

A browser performance featuring Morrow and a choir of anatomical wireframe heads. Procedural vocal-fold excitation, vocal-tract resonances, and shaped airflow generate the simulated voices.

The current version includes blue wireframe heads, visible red internals, round wireframe eyeballs, individual accessories, anatomy views, scroll zoom, and a staged performance of Rammstein's “Mutter” with timed lyrics and hand gestures.

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
- `work/mutter-speech.js` handles speech playback, voice selection, and speed.
- `work/mutter-speech-phrasing.js` handles pronunciation, timing, stress, and intonation.
- `work/mutter-phonation.js` models vocal-fold excitation and articulation.
- The remaining tracked files in `work/` provide geometry, shaders, styling, performance timing, and build inputs.

## Credits

English pronunciation data comes from the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict). Its license is retained in `work/cmudict-LICENSE.txt` and embedded in the standalone HTML.

The Rammstein performances use user-supplied lyrics and MIDI-derived arrangements. Song compositions and lyrics belong to their respective rights holders.
