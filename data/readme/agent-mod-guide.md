# MPC Sample Modding Kit

Notes from one modder working on the **Akai MPC Sample** (AC50/AZ07, firmware 1.3.0.12): what I have found, how to get a unit ready, and how to work on mods with an AI coding assistant (Claude Code, Codex or similar) without putting your MPC at risk.

It is written so you can save time. The hard parts (where the card autorun lives, what is read-only, which gestures are factory-reserved, how to get back to stock) are already worked out and marked by how well they were checked.

> **Read [docs/SAFETY.md](docs/SAFETY.md) before you touch the unit.** The rules there are what keep a bad test from becoming a broken MPC.

## Start here

| If you want to... | Read |
| --- | --- |
| Get set up and make the first safe change | [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) |
| Know what is safe to touch and how to get back to stock | [docs/SAFETY.md](docs/SAFETY.md) |
| Know what is verified about the device, and how sure I am | [docs/FINDINGS.md](docs/FINDINGS.md) |
| Give your AI assistant the rules for your repo | [templates/AGENTS.template.md](templates/AGENTS.template.md) |
| Copy-paste prompts to start a session | [templates/starter-prompts.md](templates/starter-prompts.md) |
| Install the tools (C compiler, Ghidra, REA, Git, Python, SSH) | [docs/TOOLS.md](docs/TOOLS.md) |
| How each part was built and tested (colours, MIDI, chords, scales) | [docs/techniques/README.md](docs/techniques/README.md) |
| Find the third-party projects this builds on | [docs/SOURCES.md](docs/SOURCES.md) |

## How sure am I?

Every claim in these docs carries one of three labels:

- **Verified on hardware**: someone tested it on a real unit and wrote down what happened.
- **Verified in code or files**: read from firmware, a capture, or a source file, but not yet confirmed on a unit.
- **Assumed**: my best guess. Check it before you rely on it.

Most results so far come from **one unit**, on **firmware 1.3.0.12**. Other firmware versions are not supported and may behave differently.

## What is in this kit

- Setup steps for a Windows, macOS or Linux computer, a microSD card and an SSH client.
- A safe way to run your own code on the unit from RAM, so a reboot returns it to stock.
- Device facts: memory, storage, the read-only system partition, where you may write, and what is never touched.
- A shared rule set for AI assistants (`AGENTS.template.md`), so your assistant works the same careful way every session.
- Links to the community projects this work depends on, with their own licences.

## What is not in this kit

- No Akai firmware, eMMC images, boot files or keys. Do not ask anyone to send them to you.
- No one's prepared SD card folder. Make your own; see the setup guide.
- No device serial numbers, network addresses beyond the USB default, or personal captures.

## Licence

- Code and templates: [MIT](LICENSE).
- Documentation: [CC BY 4.0](LICENSE-DOCS.md).
- Third-party projects keep their own licences. See [docs/SOURCES.md](docs/SOURCES.md).

The MPC Sample, MPC and Akai are trademarks of their owners. This kit is an independent community project and is not made, endorsed or supported by Akai Professional or inMusic Brands.

## Contributing

Add what you verified, with the date and the firmware version. Put a result on the unit in the "Verified on hardware" column, not in "Assumed". Do not add firmware, keys or personal data. Open an issue or a pull request.
