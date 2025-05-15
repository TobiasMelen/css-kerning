import { css, keyframes } from "goober";
import { ComponentProps } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import useFontParsing from "./font/useFontParsing";

const letterAnimate = keyframes`
  from{
    opacity: 0;
    transform: translateX(0.33em);
  }
  90%{
    opacity: 1;
  }
  to{
    transform: translateX(0);
  }
`;

const Link = (p: ComponentProps<"a">) => (
  <a
    {...p}
    className={
      css`
        cursor: pointer;
        font-size: 7vw;
        font-weight: 400;
        display: flex;
        flex-wrap: wrap;
        * {
          animation: ${letterAnimate} 350ms ease both;
        }
      ` +
      " " +
      p.className
    }
  />
);

const SeperatedMessage = ({ children }: { children: string }) => (
  <>
    {children.split("").map((char, index) => (
      <span
        className={char}
        key={index}
        style={{ animationDelay: `${12.5 * index}ms` }}
      >
        {char !== " " ? char : "\u00A0"}
      </span>
    ))}
  </>
);

export default function App() {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileUpload = useRef<HTMLInputElement>(null);

  const [fileBlob, setFileBlob] = useState<Blob>();

  const loadInterExample = async () => {
    const res = await fetch("./inter-display-regular.ttf");
    setFileBlob(await res.blob());
  };

  const [customClassname, setCustomClassname] = useState("");

  const { kernCss, kernings, className } = useFontParsing(
    customClassname,
    fileBlob
  );

  const [text, setText] = useState("");

  useEffect(() => {
    kernings?.fontName && setText(kernings.fontName);
  }, [kernings?.fontName]);

  return (
    <>
      <input
        type="file"
        style={{ display: "none" }}
        ref={fileUpload}
        onChange={async (e) => {
          if (!e.currentTarget.files?.[0]) {
            return;
          }
          setFileBlob(e.currentTarget.files?.[0]);
        }}
      />
      <div
        onDragOver={(_e) => setIsDragOver(true)}
        onDragLeave={(_e) => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          if (!e.dataTransfer?.files[0]) {
            return;
          }
          setFileBlob(e.dataTransfer.files[0]);
        }}
        className={css`
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100svh;
          opacity: ${isDragOver ? 0.5 : 1};
          grid-area: full;
          position: relative;
        `}
      >
        {kernings ? (
          <Link
            style={{ position: "relative" }}
            className={className}
            key={kernings?.fontName}
          >
            <SeperatedMessage>{text}</SeperatedMessage>
            <span
              style={{
                position: "absolute",
                color: "rgba(0,0,0,0.1)",
                fontKerning: "optimizeLegibility",
                caretColor: "black",
              }}
              contentEditable
              onInput={(event) => setText(event.currentTarget.textContent!)}
            >
              {kernings.fontName}
            </span>
          </Link>
        ) : (
          <Link onClick={() => fileUpload.current?.click()}>
            Upload font file
          </Link>
        )}
        <a
          className={css`
            position: absolute;
            bottom: 0;
            right: 0;
            padding: 1em;
            cursor: pointer;
          `}
          onClick={loadInterExample}
        >
          Use Inter as example
        </a>
      </div>
    </>
  );
}
