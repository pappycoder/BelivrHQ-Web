# Bundled fonts

The application uses `next/font/local` for Inter, Fraunces and Inter Tight. No Google Fonts stylesheet or binary download is needed during development, builds or browser rendering. Font files are emitted by Next.js and served from the application origin.

Inter was already bundled as `inter-variable.ttf`. Fraunces and Inter Tight normal variable faces were downloaded from the official [Google Fonts repository](https://github.com/google/fonts) at revision `5bb28733cec313b63fbd415b574b5ae35c8aa8b8`. The source files are `ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf` and `ofl/intertight/InterTight[wght].ttf`. The corresponding SIL Open Font License files are stored beside the fonts, including Inter's license. Existing CSS variable names, variable-weight ranges and optical sizing are preserved. The application previously requested the normal faces; italic styling continues using the browser's existing synthesis.
