import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
}

export function MathText({ text }: MathTextProps) {
  if (!text) return null;

  // Split text by \(...\) and \[...\]
  const regex = /(\\\[.*?\\\]|\\\(.*?\\\))/gs;
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          const math = part.substring(2, part.length - 2);
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
          const math = part.substring(2, part.length - 2);
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } else {
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
}
