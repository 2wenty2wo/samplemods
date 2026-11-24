# MPC Mix

MPC Mix is a beta app that uses an iPhone as an external DSP for the Akai MPC Sample. The MPC sends pad audio to the phone over USB. MPC Mix processes it with built-in effects and installed AUv3 plug-ins, then sends it back over the same cable. You can listen from the MPC's headphone jack.

The mixer gives each pad level, pan, mute and its own insert chain. Built-in effects include dynamic EQ, compression, Warmth saturation, delay, reverb, chorus and flanger. Warmth and reverb can use impulse response profiles. Open an AUv3 insert to edit it in the plug-in's own interface when available.

The Chop Editor shows the selected sample's waveform. Zoom in to move slice boundaries, audition a slice or preview automatic cuts. On an empty pad, you can load the included Mix Keys instrument or an AUv3 instrument installed on the iPhone. Play it from the on-screen keyboard or route MIDI from the MPC. The Piano Roll lets you move, resize and split notes in instrument loops.

For multitrack recording, select pads across banks and arm a take. The next MPC Play starts recording. Use Timeline to listen back, solo a track or seek through the take, then export separate WAV files.

## Screenshots

| Mixer | EQ |
| --- | --- |
| ![Eight pad channel strips with level, pan and mute](docs/screenshots/mixer.png) | ![EQ graph with the high band and its dynamics controls visible](docs/screenshots/eq.png) |
| **Warmth saturation** | **Reverb with Spring IR** |
| ![Warmth drive, frequency focus, mix and output meter](docs/screenshots/warmth.png) | ![Reverb controls with the Spring impulse response selected](docs/screenshots/reverb.png) |
| **Baby Audio Magic Switch (AUv3)** | **Chop Editor** |
| ![Magic Switch plug-in open inside MPC Mix](docs/screenshots/auv3-magic-switch.png) | ![Sample waveform with slice boundaries and editing controls](docs/screenshots/chop-editor.png) |
| **Piano Roll** | **Compressor** |
| ![Selected instrument note with a resize handle on the bar grid](docs/screenshots/piano-roll.png) | ![Compressor controls with VCA mode and sidechain selection](docs/screenshots/compressor.png) |

## Install

1. Use the [1.3.0.12 beta ZIP](https://github.com/orrpunk-art/MPC-Mix/releases/tag/v0.1.0-beta.1) or [build the SD ZIP for 1.4.0.8](docs/BUILD.md#sd-package). Back up existing `autorun/` and `autorun.sh` files, then extract the matching ZIP to the root of an exFAT microSD card labelled `MPCMOD`.
2. Save your MPC project and insert the card. On 1.3.0.12, choose **Start** when prompted. On 1.4.0.8, enable Developer Mode in MIDI Config and choose **Yes** when prompted. The 1.4.0.8 launcher allows one activation attempt per boot. To retry, reboot. Remove the card before powering on for a stock session.
3. On a Mac, run `pod install --deployment` in `mobile/ios`. Open `MPCChop.xcworkspace`, sign the app with your Apple team and run it on the iPhone.
4. Connect the iPhone directly to the MPC with a data-capable USB-C cable. Open MPC Mix and allow local network access if prompted.

## Compatibility and limits

Separate SD packages target **1.3.0.12** and **1.4.0.8**. The 1.4.0.8 package was validated in Virtual MPC. Native Amp Env and linked hardware zoom are available on 1.3.0.12. The app builds for **iOS 16.4 or later**. Save the project to microSD to recall its mixer and insert settings in later sessions. Third-party plug-ins must be installed separately. Audio latency depends on the USB connection, iPhone and effects in use. Full 128-pad recording is still unverified on hardware.

## Documentation

[Build and setup](docs/BUILD.md) · [Agent-assisted setup](docs/AGENT-SETUP.md) · [Controls and workflows](docs/WORKFLOW.md) · [Validation](docs/VALIDATION.md) · [Bridge API](docs/API.md)

## Credits

The bridge uses Jakub Kolcar's [mpc-sample-sdk](https://github.com/ioma8/mpc-sample-sdk) under the [MIT license](vendor/mpc-sample-sdk/LICENSE).
