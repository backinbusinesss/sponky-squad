import type { ReactNode } from "react";

/**
 * Trasforma il testo di una risposta in nodi React, rendendo cliccabili i link.
 *
 * Due forme supportate:
 *   [testo del link](https://esempio.it)
 *   https://esempio.it           (link nudo, incollato cosi' com'e')
 *
 * Non si genera HTML: si restituiscono nodi React, quindi una risposta non puo'
 * iniettare markup nella pagina nemmeno se arriva dal database.
 */

const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;

/** Toglie la punteggiatura finale che spesso si attacca a un link incollato. */
function splitTrailing(url: string) {
  const match = url.match(/^(.*?)([.,;:!?)]*)$/);
  return { href: match?.[1] ?? url, trailing: match?.[2] ?? "" };
}

export function linkify(text: string, linkClassName = ""): ReactNode[] {
  const nodes: ReactNode[] = [];
  const source = String(text ?? "");
  let cursor = 0;
  let key = 0;

  for (const match of source.matchAll(LINK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(source.slice(cursor, index));

    const labelled = match[1] !== undefined;
    const rawHref = labelled ? match[2] : (match[3] ?? "");
    const { href, trailing } = splitTrailing(rawHref);

    nodes.push(
      <a
        key={`link-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName || "font-bold text-racing-orange underline-offset-2 hover:underline"}
      >
        {labelled ? match[1] : href}
      </a>,
    );

    if (trailing) nodes.push(trailing);
    cursor = index + match[0].length;
  }

  if (cursor < source.length) nodes.push(source.slice(cursor));
  return nodes;
}

/** Versione componente, comoda dentro JSX. */
export function LinkedText({ text, linkClassName }: { text: string; linkClassName?: string }) {
  return <>{linkify(text, linkClassName)}</>;
}
