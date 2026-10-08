import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { useMemo } from "react";
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
        <img {...props} src={typeof src === "string" ? resolveImageSrc(src) : undefined} />
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
