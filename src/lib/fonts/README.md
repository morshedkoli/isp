# Report fonts

`NotoSansBengali-{Regular,Bold}.ttf` — from [notofonts/bengali](https://github.com/notofonts/bengali),
licensed under the SIL Open Font License 1.1 (see `OFL.txt`).

Used by [`src/lib/pdf-font.ts`](../pdf-font.ts) to shape and outline Bengali names in the
generated PDF reports; pdf-lib's built-in Helvetica is WinAnsi-only and cannot render them.

The files are read from disk at request time, so `next.config.ts` lists this directory in
`outputFileTracingIncludes` for `/api/reports/pdf` — without that they are missing from the
deployed bundle.
