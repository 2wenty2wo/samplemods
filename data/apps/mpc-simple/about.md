## Classic MPC workflow

MPC Simple replaces the MPC Sample's software with an operating system written
from scratch on JUCE. It aims to work like the classic MPCs (MPC60, 3000,
2000XL, 1000 and 2500) rather than adding the DAW-style features of the larger
modern MPCs.

- **Programs are back.** A program is a kit of pads that any number of tracks
  and sequences can share.
- **Samples live in a project sample pool**, separate from pads. One sample can
  play on many pads and programs.
- **Keygroup, MIDI and instrument programs** alongside drum programs.
  Instruments and effects are CLAP plugins, and you can add your own.

## In the beta

- A classic MAIN screen, MPC2000XL-style sequence edits, Step Edit as an event
  list and Grid Edit with nudge, ratchet and probability.
- Timing correct with strength and shift timing, song mode and next sequence.
- Loads MPC60, MPC3000, MPC2000XL and MPC1000 programs, plus `.xpm` programs.
- Live loop recording, resampling with stems and stem separation in Sample
  Edit.
- Projects are saved in the stock `.xpj` format, so they still open in MPC OS.
- MPC Simple Control: the unit's screen, plugins and files in a web browser
  over USB.

## Install and remove

Copy the release's SD Card folder to the top level of an exFAT card with at
least 200 MB free, then start the MPC Sample with the card inserted. Nothing is
installed on the unit. To return to the stock software, remove the card and
restart. Tested with MPC Sample software 1.3.0.12. Back up projects that matter
to you: this is a beta.
