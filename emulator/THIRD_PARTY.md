# Emulator runtime

Korona hosts the emulator frontend and Libretro core binaries locally. The catalog and game files originate from `gamonl.json`; ROMs, artwork, and BIOS files are fetched from `gam.onl` through Korona's Wisp relay at play time. No gam.onl JavaScript library is loaded at play time.

- The main frontend and prebuilt cores are derived from [webretro](https://github.com/BinBashBanana/webretro), whose MIT license is included as `LICENSE` in this directory.
- Additional frontend and Libretro core binaries for PC Engine, MSX, arcade, MSU, and ColecoVision compatibility were copied from gam.onl and adapted to load from this directory. Their individual core projects are part of the [Libretro ecosystem](https://www.libretro.com/).
- No ROM or BIOS files are included in this directory.
