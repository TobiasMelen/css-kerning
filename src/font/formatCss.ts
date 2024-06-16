import { ExtractedFontInfo } from "./extractKerning";

export default function formatCss(className: string, info: ExtractedFontInfo) {
  const kerningCss = info.kerningGroups.reduce(
    (acc, spec) =>
      acc +
      `
${spec?.kernings.reduce(
  (acc, kerning) =>
    acc +
    `
:is(.${spec.chars.map(sanitizeClass).join(",.")}) + :is(.${kerning.chars
      .map(sanitizeClass)
      .join(",.")}) {
  margin-left: ${kerning.kerning / 1000}em;
}`,
  ""
)}`,
    ""
  );
  return `.${className} {${kerningCss}}`;
}

const sanitizeClass = (className: string) =>
  className.match(/^\d/)
    ? [`\\3${className.charAt(0)}`, className.substring(1)]
        .filter(Boolean)
        .join(" ")
    : className;
