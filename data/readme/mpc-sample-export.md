# MPC Sample Export

**Made by savi** · [madebysavi.com](https://madebysavi.com)

MPC Sample Export is a local Windows desktop exporter for Akai MPC Sample XPJ projects. It opens a project and its ProjectData samples, then exports selected pads as synchronized stem WAVs, a combined Sequence or Song WAV, MIDI notes, or both WAV and MIDI. Song export follows the saved sequence order and repeats. It does not separate audio with AI, and it is not an Akai product.

[Download MPC Sample Export for Windows x64](https://github.com/savicreations/mpc-sample-export-downloads/releases/latest/download/MPC-Sample-Export-Windows-x64.zip)

## Run the portable app

1. Download the Windows x64 ZIP and extract the **whole** folder.
2. Open the extracted `MPC Sample Export-win32-x64` folder and run `MPC Sample Export.exe`.
3. Choose your `.xpj` project. If prompted, locate its matching ProjectData folder. Choose an export destination, WAV or MIDI output, and the pads to include.

The portable app includes its runtime; Node.js and an installer are not required. Keep the EXE and companion files together. This version is unsigned, so Windows may show a publisher warning. Project files and samples stay on your computer.

Compatibility has been tested with the owner's MPC Sample XPJ projects, including saved Song Mode arrangements and per-note chops. Other MPC models, project versions, effects, automation, and hardware-exact playback are not guaranteed. Compare critical exports with your MPC recording.

The app uses the [MIT license](LICENSE). App credits and separate bundled dependency notices are included in the ZIP. The source repository is private; this repository holds download information and release assets only.
