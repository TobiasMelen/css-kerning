import { Font } from "opentype.js";

const isWoff2 = (buffer: ArrayBuffer) => {
  const brotliSignature = [0x77, 0x4f, 0x46, 0x32];
  const dataView = new DataView(buffer);
  return brotliSignature.some((char, index) => char == dataView.getInt8(index));
};

const parseFontAsyncish = async (blob: Blob) => {
  const opentypeImport = import("../vendor/opentype.module.modified");

  let arrayBuffer = await blob.arrayBuffer();
  if (isWoff2(arrayBuffer)) {
    const decompress = await import("woff2-encoder/decompress").then(
      (brotli) => brotli.default
    );
    const decompressed = await decompress(arrayBuffer);
    arrayBuffer = decompressed.buffer;
  }
  const opentype = await opentypeImport;

  /* opentype parsing is a sync thing,
   * At least put the operation on the event loop.
   */
  return new Promise<opentype.Font>((res, rej) =>
    queueMicrotask(() => {
      try {
        res(opentype.parse(arrayBuffer));
      } catch (e) {
        rej(e);
      }
    })
  );
};

export type ExtractedFontInfo = Awaited<ReturnType<typeof extractFontInfo>>;
export type GroupedKernings = ExtractedFontInfo["kerningGroups"];

const fontRanges = {
  latin: [
    [48, 57],
    [65, 90],
    [97, 122],
    [192, 255],
  ],
} satisfies Record<string, [number, number][]>;

export default async function extractFontInfo(
  blob: Blob,
  unicodeRanges: [number, number][] = fontRanges.latin
) {
  const font = await parseFontAsyncish(blob);

  const unicodeGlyphs = new Array(font.glyphs.length)
    .fill(null)
    .map((_, index) => font.glyphs.get(index))
    .filter(
      (glyph) =>
        glyph.unicode &&
        unicodeRanges.some(
          ([min, max]) => glyph.unicode! >= min && glyph.unicode! <= max
        )
    );

  const kerningSpecs = unicodeGlyphs
    .map((glyph1) => ({
      chars: [String.fromCharCode(glyph1.unicode!)],
      kernings: Object.entries(
        unicodeGlyphs.reduce(
          (acc, glyph2) => {
            const kerning = font.getKerningValue(glyph1, glyph2);
            if (kerning) {
              acc[kerning] ??= [];
              acc[kerning].push(String.fromCharCode(glyph2.unicode!));
            }
            return acc;
          },
          {} as Record<number, string[]>
        )
      ).map(([value, chars]) => ({
        kerning: parseInt(value) / (font.tables.head.unitsPerEm ?? 1000),
        chars,
      })),
    }))
    .filter((kerningData) => kerningData.kernings.length);

  const removedIndexes: number[] = [];
  const kerningGroups = kerningSpecs
    .map((spec, index) => {
      if (removedIndexes.includes(index)) {
        return null;
      }
      const duplicates = kerningSpecs
        .slice(index + 1)
        .filter((compareKerning, partialSubIndex) => {
          const subIndex = index + partialSubIndex + 1;
          const isDuplicateKerning =
            !removedIndexes.includes(subIndex) &&
            compareKerning.kernings.every(
              (kerning, index) =>
                JSON.stringify(kerning) === JSON.stringify(spec.kernings[index])
            );
          if (isDuplicateKerning) {
            removedIndexes.push(subIndex);
          }
          return isDuplicateKerning;
        })
        .flatMap((kerning) => kerning.chars);
      return { ...spec, chars: [...spec.chars, ...duplicates] };
    })
    .filter(Boolean);
  return {
    fontName: getFontname(font),
    kerningGroups,
  };
}

const getFontname = (font: Font) =>
  font.names.fullName?.["en"] ??
  //@ts-ignore: The windows prop exists in some fonts
  font.names.windows?.fullName?.["en"];
