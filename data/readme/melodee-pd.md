# Melodee PD

A phase distortion synth as a native plug-in for Akai MPC OS standalone devices (MPC Live / One / X / Key,
Force; Gen1 armv7 and Gen2 aarch64) and for [Melodee](https://github.com/keremimo/melodee-sample) on the MPC
Sample, built with the [Open MPC](https://open-mpc.github.io) toolchain: a VST2 instrument with its own MPC
screen page, Q-Link pages and factory presets in MPC's PRESET menu.

It is Melodee's CZ engine, out of Melodee as a plug-in of its own: the same voice to the sample (see "Where it
comes from").

**Status: 1.0.0.** The engine passes its host checks, and the armv7 and aarch64 builds, their skin and the
toolchain's port test (`tools/test_port.sh`) pass. The aarch64 build is tested in Melodee on the MPC Sample. It
has not been tested on an MPC OS device yet: `tested.json` lists none.

## What it is

- **Eight voices** of a cosine read with a bent phase. The **DCW**, with its own envelope and key follow, bends it
  from a pure sine into a saw, square, pulse, double sine or saw-pulse, or windows a higher partial into one of
  three resonances (saw, triangle, trapezoid window).
- **Wave 2** alternates with wave 1 each cycle; **lines** 1, 2, 1+1' and 1+2' play one line, or two detuned
  (the second an octave apart if you like, and with 1+2' on wave 2 throughout).
- **DCA envelope** and velocity; each wave's average is taken out (as the originals' outputs were AC coupled),
  and a new note starts where its wave crosses zero, so nothing thumps or clicks.
- **Pressure** (poly and channel aftertouch): vibrato and a brighter DCW; the mod wheel opens the DCW too.
- **A mod matrix** of eight routes: LFO, velocity, aftertouch, wheel, key, random or the DCW envelope into the
  DCW, level, pitch, either line's pitch or the LFO rate.
- **8 factory sounds**: Init Voice, Glass Pad, PD Bass, Reso Sweep, Brass, Electric Piano, Saw Strings, Pulse
  Organ. A sound sets the voice; the mod matrix and Volume stay as you set them.

## The MPC page

Three tabs, each two rows of eight controls that are MPC's two banks of eight Q-Links (row 1 is Q-Links 1-8,
row 2 is 9-16): **WAVES** (waves and DCW, lines, velocity; pressure and Volume), **ENVELOPES** (the DCW envelope
and key follow; the DCA envelope) and **MATRIX** (eight routes as columns of source, destination and amount;
Q-Link pages MOD 1-4 and MOD 5-8). Melodee's NIGHT palette with a violet accent.

## MIDI

| Message | Does |
|---|---|
| Note on / off | plays (velocity 0 is a release) |
| Pitch bend | two semitones |
| CC 1 | the mod wheel (opens the DCW) |
| Poly pressure, channel pressure | a held key's pressure / every held key's |
| CC 64 | sustain pedal |
| CC 84, then a note | **slide**: the voice of the key CC 84 named goes on as the new note without a new attack, gliding in 60 ms |
| CC 68 down, CC 84, then a note | **tie**: the same, without the glide |
| CC 120 / 123 / 121 | all sound off / all notes off / reset controllers |
| CC 20-35, NRPN | the first page's Q-Links / any parameter by number (the Open MPC wrapper's) |

Melodee sends CC 84 and CC 68 for its sequencer's Slide and Tie steps. The plug-in answers on every channel.

## The state

What a project saves (VST2 chunk) is text: `melodee-pd 1`, then one `key=value` line per parameter (keys as in
`vst/params.json`; an option may be given by name). Keys it does not know are passed over and the ones it does
not find stay at their initial values, so older states load. Two more lines import a Melodee track as Melodee's
project file kept it: `melodee=<values in the order of src/pd.h's Param>` (a project from before pad pressure
names fewer: the rest stay at their initial values) and `melodee_mods=<source>:<destination>:<amount>,...` (the
eight routes, sources and destinations numbered as in `src/core/mod_matrix.h`; one this synth has no destination
for is dropped). Melodee writes these when it opens a project made while CZ was built in.

## Building

The device builds use [mpc-vst-plugins](https://github.com/sd88me/mpc-vst-plugins) (MIT), checked out beside
this repository (or named by `MPC_VST`), and Docker:

```sh
vst/build.sh            # armv7 and aarch64: vst/build/melodee_pd.so, vst/build/aarch64/melodee_pd.so, the skin
```

`vst/build.sh` calls the toolchain's `tools/build_port.sh` with `vst/vst.json`: the skin from `vst/layout.conf`, its
artwork drawn in a browser (`"art": "html"`, the toolchain's `mpc-vst-html-art` image) in Melodee's Rubik
(`vst/skin.css`, `vst/fonts/`),
`params.h` from `vst/params.json`, the presets from `vst/presets.json` and the `.so` linked with the toolchain's
VST2 wrapper (44.1 kHz, sample-accurate notes). Then `tools/test_port.sh vst/vst.json` (the wrapper's own host
test), a CPU bench and `tools/release.py` make the `-mpc-armv7.zip` and `-mpc-aarch64.zip` (the toolchain's
docs/RELEASING.md). `tools/add_plugin_json.py --repo keremimo/mpc-vst-melodee-pd dist/*.zip` then adds Akai's
`plugin.json` beside `plugin-meta.xml` in each zip (MPC OS 3.10.1 and later list plug-ins from `VST2 Plugins/` by
it); a newer toolchain writes the same file.

On the host, with a C++17 compiler:

```sh
make test               # the synth's checks under ASan and UBSan, and that the JSON files are current
make json               # vst/params.json and vst/presets.json from the tables in src/pd.cpp
python3 tools/make_layout.py    # vst/layout.conf from the tab spec in that script
```

The parameter table in `src/pd.cpp` is the one place a parameter is stated: the JSON files and the layout are
made from it. Parameters only ever go on the end (projects and skins bind by index; the toolchain's
`vst/params.lock`, written by the first build, holds them to it).

## Installing

- **MPC OS (Gen1, Gen2):** the release zips carry their own `install.sh` and `INSTALL.md` (root SSH; the
  toolchain's installer app, Plugin Manager VST or `mpc-store.sh` install them too).
- **MPC OS 3.10.1 and later:** the plug-in folder (in the release zip under `portable/`) also works copied into
  `VST2 Plugins/` on a drive: its `plugin.json` names the `.so`.
- **Melodee on the MPC Sample:** download `Melodee-PD-1.0.0-mpc-sample.zip` from the release, unzip it and copy the
  plug-in folder inside (`Ellic Studio - VST - Melodee PD`) into `Plugins/` at the top of the SD card. Melodee plays it on a PLUGIN track, and a project
  saved with Melodee's built-in CZ engine (Melodee 0.1.0-alpha.6 and before) opens with that track on Melodee PD,
  as it sounded.

## Where it comes from

Melodee PD is Melodee's CZ engine (melodee-sample, `src/melodee/engine/cz.cpp`, commit `1fbca79`), written from
scratch for Melodee. Its DSP is unchanged: rendered side by side with Melodee's engine, every factory sound with
mod routes, slides, pressure, wheel, bend and odd block cuts is identical to the bit. Only what Melodee's own host
used is gone (the sequencer's accent, which Melodee now sends as velocity, and its overload guard). It is an
independent design in the phase distortion family, not a model or copy of any instrument; the factory sounds
were made for it.

## Licence and credit

AGPL-3.0-only (`LICENSE`). Melodee PD is the work of Kerem Kiliç (Ellic Studio), from Melodee. The Open MPC
toolchain and its VST2 wrapper, which the build links, are sd88me's (MIT). Rubik (`vst/fonts/Rubik-VF.ttf`, the
skin's typeface) is The Rubik Project Authors', under the SIL Open Font License 1.1 (`vst/fonts/OFL.txt`).
