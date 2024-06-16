import { useState, useEffect, useMemo } from "preact/hooks";
import extractFontInfo from "./extractKerning";
import formatCss from "./formatCss";

export default function useFontParsing(className?: string, fileBlob?: Blob) {
  const [kernings, setKernings] =
    useState<Awaited<ReturnType<typeof extractFontInfo>>>();

  className ||= kernings && `kern_${kernings.fontName.replaceAll(" ", "_")}`;

  useEffect(() => {
    if (!fileBlob) {
      return;
    }
    extractFontInfo(fileBlob)
      .then((kernings) => setKernings(kernings))
      .catch((e) => {
        alert(`Can't load font file: ${e.message}`);
      });
    return () => setKernings(undefined);
  }, [fileBlob]);

  useEffect(() => {
    if (!fileBlob || !kernings) {
      return;
    }
    const fontName = kernings.fontName;
    (async () => {
      const font = await new FontFace(
        fontName,
        await fileBlob.arrayBuffer()
      ).load();
      document.fonts.add(font);
    })();
    document.body.style.fontFamily = fontName;
  }, [fileBlob, kernings]);

  const kernCss = useMemo(() => {
    if (!kernings || !className) {
      return;
    }
    return formatCss(className, kernings);
  }, [kernings, className]);

  useEffect(() => {
    if (!kernCss) {
      return;
    }
    const style = document.createElement("style");
    style.textContent = kernCss;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [kernCss]);

  return { kernings, kernCss, className };
}
