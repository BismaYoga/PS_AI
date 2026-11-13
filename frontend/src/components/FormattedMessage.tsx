import React from 'react';

// Format inline text: **bold**, *italic*, `code`, ***bold italic***
export function formatInlineText(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match bold-italic, bold, italic, and inline code
  const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|_([^_]+)_)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('***') && token.endsWith('***') && token.length > 6) {
      parts.push(
        <strong key={match.index}>
          <em>{token.slice(3, -3)}</em>
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      parts.push(
        <code key={match.index} className="chat-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('_') && token.endsWith('_') && token.length > 2) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface FormattedMessageProps {
  content: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content }) => {
  if (!content) return null;

  const rawLines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Code blocks (```lang ... ```)
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length) i++; // consume closing ```
      elements.push(
        <pre key={`code-${i}`} className="chat-code-block" style={{
          background: '#f1f5f9',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          overflowX: 'auto',
          fontFamily: 'ui-monospace, monospace',
          margin: '8px 0',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // 2. Horizontal divider (---, ***, ___)
    if (line === '---' || line === '***' || line === '___') {
      elements.push(<hr key={`hr-${i}`} className="chat-divider" />);
      i++;
      continue;
    }

    // 3. Headings (# Judul, ## Judul, ### Judul, #### Judul)
    const headerMatch = line.match(/^(#{1,6})\s*(.*)$/);
    if (headerMatch) {
      const level = Math.min(headerMatch[1].length, 4);
      let title = headerMatch[2].trim();
      // Bersihkan tanda bintang tebal di sekitar judul jika ada (**Judul**)
      if (title.startsWith('**') && title.endsWith('**')) {
        title = title.slice(2, -2).trim();
      }
      const Tag = level <= 2 ? 'h4' : 'h5';
      elements.push(
        <Tag key={`h-${i}`} className={`chat-heading chat-h${level}`}>
          {formatInlineText(title)}
        </Tag>
      );
      i++;
      continue;
    }

    // 4. Blockquotes (> Catatan)
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s*/, '').trim();
      elements.push(
        <blockquote key={`quote-${i}`} style={{
          borderLeft: '3px solid #cbd5e1',
          paddingLeft: '10px',
          margin: '6px 0',
          color: 'var(--muted)',
          fontSize: '12.5px',
          fontStyle: 'italic',
        }}>
          {formatInlineText(quoteText)}
        </blockquote>
      );
      i++;
      continue;
    }

    // 5. Markdown Tables (| Kolom 1 | Kolom 2 |)
    if (line.startsWith('|') && (line.endsWith('|') || line.includes('|'))) {
      const tableLines: string[] = [];
      while (
        i < rawLines.length &&
        rawLines[i].trim().includes('|') &&
        (rawLines[i].trim().startsWith('|') || rawLines[i].trim().endsWith('|'))
      ) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) => {
          let s = rowStr.trim();
          if (s.startsWith('|')) s = s.slice(1);
          if (s.endsWith('|')) s = s.slice(0, -1);
          return s.split('|').map((c) => c.trim());
        };

        const headers = parseRow(tableLines[0]);
        // Filter baris separator (seperti |:---|:---| atau |---|---|)
        const isSeparator = (rowStr: string) =>
          /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(rowStr);

        const dataRows = tableLines.slice(1).filter((r) => !isSeparator(r)).map(parseRow);

        elements.push(
          <div key={`tbl-${i}`} className="chat-table-container">
            <table className="chat-table">
              <thead>
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx}>{formatInlineText(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((r, rIdx) => (
                  <tr key={rIdx}>
                    {r.map((c, cIdx) => (
                      <td key={cIdx}>{formatInlineText(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 6. Unordered Lists (* Item, - Item, • Item, + Item)
    const listMatch = line.match(/^([*\-+•])\s+(.*)$/);
    if (listMatch) {
      const listItems: string[] = [];
      while (i < rawLines.length) {
        const itemLine = rawLines[i].trim();
        const m = itemLine.match(/^([*\-+•])\s+(.*)$/);
        if (m) {
          listItems.push(m[2]);
          i++;
        } else if (itemLine === '') {
          if (i + 1 < rawLines.length && rawLines[i + 1].trim().match(/^([*\-+•])\s+/)) {
            i++;
            continue;
          }
          break;
        } else {
          break;
        }
      }

      elements.push(
        <ul key={`ul-${i}`} className="chat-list">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="chat-list-item">
              <span className="chat-list-bullet">•</span>
              <span className="chat-list-text">{formatInlineText(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Numbered Lists (1. Item, 2. Item)
    const numMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      const numItems: { num: string; text: string }[] = [];
      while (i < rawLines.length) {
        const itemLine = rawLines[i].trim();
        const m = itemLine.match(/^(\d+)[.)]\s+(.*)$/);
        if (m) {
          numItems.push({ num: m[1], text: m[2] });
          i++;
        } else {
          break;
        }
      }

      elements.push(
        <ol key={`ol-${i}`} className="chat-num-list">
          {numItems.map((item, itemIdx) => (
            <li key={itemIdx} className="chat-num-item">
              <span className="chat-num-badge">{item.num}</span>
              <span className="chat-num-text">{formatInlineText(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Normal Paragraph
    elements.push(
      <p key={`p-${i}`} className="chat-paragraph">
        {formatInlineText(line)}
      </p>
    );
    i++;
  }

  return <div className="formatted-chat-message">{elements}</div>;
};
