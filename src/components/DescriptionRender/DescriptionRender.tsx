'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Components } from 'react-markdown';

/* DescriptionRender component prop types -------------- */
interface DescriptionRenderProps {
  markdown: string;
}

/* Constants ------------------------------------------- */
const components: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
      {...props}
    >
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }) => (
    // Markdown images come from arbitrary, unknown hosts with unknown
    // dimensions; next/image would require whitelisting every domain in
    // next.config remotePatterns, so a plain <img> is the correct choice here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ''}
      className="max-w-full mx-auto my-2 rounded-md"
      {...props}
    />
  ),
};

/* DescriptionRender component ------------------------- */
const DescriptionRender: React.FC<DescriptionRenderProps> = ({ markdown }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[ remarkGfm ]}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  );
};

/* Export DescriptionRender component ------------------ */
export default DescriptionRender;
