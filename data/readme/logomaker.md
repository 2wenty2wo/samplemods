# LogoMaker — SD-card drop-in edition

Put your picture and optional MP3 **inside `autorun` on the SD card**. The MPC prepares them at startup. **No GitHub account, repository, Python, FFmpeg, Actions or build step is needed.**

**Owner-verified on MPC Sample firmware 1.3.0.12:** the owner confirms the SD drop-in edition works as intended.

For **Akai MPC Sample firmware 1.3.0.12 only**. Stock firmware is not modified. This is a late startup logo; stock workflow restarts afterward.

## 1. Download and copy

[Download LogoMaker ZIP](https://github.com/Trinzik-Labs/LogoMaker/archive/refs/heads/main.zip), then extract it on your computer. Inside `LogoMaker-main`, copy the complete **`autorun`** folder to the SD card root. Replace the previous autorun folder as a whole; do not merge package versions or combine autorun applications. Keep your old working package on your computer as a fallback.

Your card should look like this:

```text
SD card/
└── autorun/
    ├── autorun.sh
    ├── autorun.json
    ├── autorun.check
    ├── image/
    │   ├── your-logo.png       ← exactly one image
    │   └── README.txt
    ├── sound/
    │   ├── your-sound.mp3      ← optional: zero or one MP3
    │   └── README.txt
    ├── READ-ME.txt
    └── all other supplied programs, scripts and notices
```

The supplied `logo.png` and `boot.mp3` are examples. Delete or replace them when adding your own files. Do not copy the outer `LogoMaker-main` folder onto the card or create `autorun/autorun`.

## 2. Choose your image

Open **`SD:\autorun\image\`** and leave exactly one supported image there. Any filename is fine. If your new file has a different name, delete the old image first. Keep `README.txt`.

- **Formats:** PNG, JPG/JPEG, BMP, GIF (first frame), TGA. PNG/JPG recommended.
- **Fit:** the entire picture is centered proportionally on a black 320×240 screen. No crop or stretch. Transparent pixels become black.
- **Size:** up to 20 MiB, 4096 pixels per side and 8 megapixels. Small 320×240 or 640×480 images load faster.
- **Orientation:** export/save the picture upright; JPEG EXIF auto-rotation is not applied.
- **Not supported:** WebP, HEIC, SVG or animated playback.

Your image is a **still logo for three seconds**. The package does not automatically detect or animate eyes in arbitrary pictures. Multiple images, subfolders, shortcuts or corrupt files cause a logged skip while stock remains running.

## 3. Choose your sound—or use silence

Open **`SD:\autorun\sound\`** and leave zero or one **MP3** there. Replace/delete the example `boot.mp3`; keep `README.txt`. Leave no MP3 for a silent logo. Any MP3 filename, including spaces, is fine.

Use a clip about three seconds long. Short clips finish early; longer clips are stopped when the logo ends. Playback uses **50% software gain**. Maximum input is 20 MiB. WAV, OGG, FLAC and M4A are not supported in this edition; export the sound as MP3 first.

## 4. Owner-approved hardware use

Back up projects. Keep the MPC powered off during card preparation and insertion. Safely eject the card from your computer before inserting it, then power on. Do not insert this autorun into an active project/session.

Every cold boot reads the current image and MP3 from those folders, so **you do not rebuild anything after replacing files**. The package prepares data in temporary RAM before stopping stock workflow. Program/firmware integrity checks and recovery remain enabled. Removing the card while powered off disables LogoMaker on the next boot; no firmware uninstall or flash is needed.

## Keep the other files intact

Only `image/` and `sound/` are customization folders. The other supplied files are programs, integrity checks and recovery components. Do not edit, rename, resave or delete them. Editable media is intentionally separate from the protected code checksums.

The included temporary speaker-routing candidate checks output jacks, saves original speaker/mic values in RAM, temporarily enables the speaker with the mic off when no output jack is present, and attempts restoration before workflow returns. Actual speaker operation is still hardware-unverified. Existing native quick-logo and headphone-playback architecture is owner-tested; the on-device drop-in flow is now **owner-verified as working as intended**. This confirmation does not establish every supported format, failure path or separate speaker-route behavior.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Stock starts but no custom logo | Correct `SD:\autorun\autorun.sh` layout; exactly one supported image; genuine uncorrupted file. |
| Old image is still present | Remove the example/old file before adding a different filename; do not leave two images. |
| No sound | One genuine MP3 in `autorun/sound`; check output connections and logs. No MP3 means silence. |
| Image rotated unexpectedly | Export an upright PNG/JPG instead of relying on EXIF orientation. |
| Slow preparation | Use a smaller PNG/JPG and a short MP3; the new on-device preparation time is not yet measured. |
| Checksum failure | Replace the complete program package. Do not remove checks to bypass an error. |

Logs are written to `autorun/CustomLogo-status.txt` and `autorun/CustomLogo-runtime.txt`. Preserve both when reporting a problem. These files can confirm stages/errors, but a submitted frame/player start is not proof of visible/audible output.

**[Detailed offline instructions](autorun/READ-ME.txt)** are also included inside the folder you copy to the card. Development source, tests, dependency notices and limits live in [CustomLogo](https://github.com/Trinzik-Labs/CustomLogo/blob/main/docs/sd-dropin.md). All 90 host tests pass. The owner subsequently confirmed this edition works on the MPC; the developer did not perform hardware operations.
