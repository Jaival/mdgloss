import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { useMemo, useState, type ComponentProps } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { markdownToHast } from "./pipeline";

interface MarkdownProps {
  source: string;
  /** Turns an image src from the markdown into a URL the webview can load. */
  resolveImageSrc: (src: string) => string;
  /** Called for every link click; the default navigation is always prevented. */
  onLinkClick: (href: string) => void;
}

/**
 * Renders markdown as React elements (no innerHTML). Platform specifics such as
 * file URLs and opening links come in through props.
 */
export function Markdown({ source, resolveImageSrc, onLinkClick }: MarkdownProps) {
  const tree = useMemo(() => markdownToHast(source), [source]);

  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: {
      img: ({ src, ...props }) => (
        // key: a new src gets a fresh load instead of keeping the last one's failure.
        <MarkdownImage key={String(src)} {...props} src={src} resolveSrc={resolveImageSrc} />
      ),
      a: ({ href, ...props }) => (
        <a
          {...props}
          href={href}
          onClick={(event) => {
            event.preventDefault();
            if (href) onLinkClick(href);
          }}
        />
      ),
    },
  });
}

type ImageProps = ComponentProps<"img"> & { resolveSrc: (src: string) => string };

/** An image that turns into a visible placeholder when its file can't be loaded. */
function MarkdownImage({ src, resolveSrc, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (typeof src !== "string" || failed) return <MissingImage {...props} src={src} />;
  return <img {...props} src={resolveSrc(src)} onError={() => setFailed(true)} />;
}

/**
 * Says which image is missing, using the src as written in the markdown. Keeps the
 * data-source attributes so the placeholder still maps back to the source.
 */
export function MissingImage({ src, alt, ...props }: ComponentProps<"img">) {
  const name = typeof src === "string" ? decodeSrc(src) : "";
  const dataAttributes = Object.fromEntries(
    Object.entries(props).filter(([key]) => key.startsWith("data-")),
  );
  return (
    <span
      {...dataAttributes}
      className="missing-image"
      role="img"
      aria-label={`Image not found: ${alt || name}`}
    >
      <span className="missing-image-label">Image not found</span>
      {alt && <span>{alt}</span>}
      <code>{name}</code>
    </span>
  );
}

/** The renderer URL-encodes srcs; show "process states.png", not "process%20states.png". */
function decodeSrc(src: string): string {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}
