/**
 * Bengali-capable text drawing for pdf-lib.
 *
 * pdf-lib's standard fonts are WinAnsi-only, so any Bengali name used to be
 * stripped out of the generated reports (partners and agents showed up as
 * "Partner <id>"). Embedding a Unicode font is not enough on its own either:
 * pdf-lib ignores the per-glyph offsets that Indic scripts rely on, which puts
 * matras and conjunct marks in the wrong place.
 *
 * So Bengali runs are shaped with fontkit and painted as vector outlines, while
 * ASCII runs keep using the built-in Helvetica — labels, dates and money stay
 * real, selectable text and only the Bengali is drawn as paths.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from 'fontkit';
import type { Color, PDFFont, PDFPage } from 'pdf-lib';

/** Bengali block plus the joiners that shaping depends on. */
const BENGALI_PATTERN = /[ঀ-৿‌‍]/;

/**
 * Characters that neither Helvetica nor the Bengali font renders well, mapped
 * to a lookalike. Applied before the text is split into runs, so the Taka sign
 * (which lives in the Bengali block but has no glyph in Noto Sans Bengali)
 * never reaches the shaper.
 */
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/[‘’‛]/g, "'"],
  [/[“”]/g, '"'],
  [/[–—−]/g, '-'],
  [/…/g, '...'],
  [/[   ]/g, ' '],
  [/[৲৳₹]/g, 'BDT '],
];

/** Applies the lookalike map. Runs before any measuring or drawing. */
function normalize(text: string): string {
  return REPLACEMENTS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}

export type FontWeight = 'regular' | 'bold';

const FONT_FILES: Record<FontWeight, string> = {
  regular: 'NotoSansBengali-Regular.ttf',
  bold: 'NotoSansBengali-Bold.ttf',
};

const fontCache = new Map<FontWeight, fontkit.Font | null>();

/**
 * Loads the bundled Bengali font. Returns null (once warned) when the file is
 * unavailable so report generation degrades to Latin instead of failing.
 */
function bengaliFont(weight: FontWeight): fontkit.Font | null {
  const cached = fontCache.get(weight);
  if (cached !== undefined) return cached;

  let font: fontkit.Font | null = null;
  try {
    const file = path.join(process.cwd(), 'src', 'lib', 'fonts', FONT_FILES[weight]);
    const loaded = fontkit.create(readFileSync(file));
    font = 'layout' in loaded ? loaded : null;
  } catch (error) {
    console.error(`[pdf-font] Bengali font "${FONT_FILES[weight]}" could not be loaded`, error);
  }
  fontCache.set(weight, font);
  return font;
}

/** Strips anything Helvetica cannot encode, after normalising common punctuation. */
export function toWinAnsi(text: string): string {
  return normalize(text).replace(/[^\x20-\x7E]/g, '');
}

interface TextRun {
  text: string;
  isBengali: boolean;
}

/** Splits a string into alternating Bengali / non-Bengali runs. */
function splitRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const char of text) {
    const isBengali = BENGALI_PATTERN.test(char);
    const last = runs[runs.length - 1];
    if (last && last.isBengali === isBengali) last.text += char;
    else runs.push({ text: char, isBengali });
  }
  return runs;
}

function bengaliRunWidth(font: fontkit.Font, text: string, size: number): number {
  return (font.layout(text).advanceWidth / font.unitsPerEm) * size;
}

/** Width of mixed Bengali/Latin text, matching what {@link drawText} paints. */
export function measureText(text: string, size: number, helvetica: PDFFont, weight: FontWeight = 'regular'): number {
  return splitRuns(normalize(text)).reduce((width, run) => {
    if (!run.isBengali) return width + helvetica.widthOfTextAtSize(toWinAnsi(run.text), size);
    const font = bengaliFont(weight);
    return font ? width + bengaliRunWidth(font, run.text, size) : width;
  }, 0);
}

interface DrawOptions {
  x: number;
  y: number;
  size: number;
  helvetica: PDFFont;
  weight?: FontWeight;
  color: Color;
}

function drawBengaliRun(page: PDFPage, font: fontkit.Font, text: string, options: DrawOptions): number {
  const { x, y, size, color } = options;
  const scale = size / font.unitsPerEm;
  const run = font.layout(text);
  let pen = x;

  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index];
    // fontkit paths are y-up; pdf-lib's drawSvgPath flips y, so pre-flip here.
    const commands = glyph.path.scale(1, -1).toSVG();
    if (commands) {
      page.drawSvgPath(commands, {
        x: pen + position.xOffset * scale,
        y: y + position.yOffset * scale,
        scale,
        color,
        borderWidth: 0,
      });
    }
    pen += position.xAdvance * scale;
  });

  return run.advanceWidth * scale;
}

/**
 * Draws mixed Bengali/Latin text at a baseline and returns the width painted.
 * Bengali is shaped and outlined; everything else is Helvetica text.
 */
export function drawText(page: PDFPage, text: string, options: DrawOptions): number {
  const { size, helvetica, weight = 'regular', color } = options;
  let pen = options.x;

  for (const run of splitRuns(normalize(text))) {
    if (run.isBengali) {
      const font = bengaliFont(weight);
      if (font) pen += drawBengaliRun(page, font, run.text, { ...options, x: pen });
      continue;
    }
    const safe = toWinAnsi(run.text);
    if (safe.length === 0) continue;
    page.drawText(safe, { x: pen, y: options.y, size, font: helvetica, color });
    pen += helvetica.widthOfTextAtSize(safe, size);
  }

  return pen - options.x;
}

/** Truncates to a maximum rendered width, adding an ellipsis when it has to cut. */
export function truncateToWidth(text: string, maxWidth: number, size: number, helvetica: PDFFont, weight: FontWeight = 'regular'): string {
  if (measureText(text, size, helvetica, weight) <= maxWidth) return text;

  const characters = Array.from(text);
  let clipped = '';
  for (let index = 0; index < characters.length; index += 1) {
    const candidate = clipped + characters[index];
    if (measureText(`${candidate}...`, size, helvetica, weight) > maxWidth) break;
    clipped = candidate;
  }
  return `${clipped.trimEnd()}...`;
}
