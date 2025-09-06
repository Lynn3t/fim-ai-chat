'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface ComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface LinkProps extends ComponentProps {
  href?: string;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
  randomChars?: string;
  isLoading?: boolean;
}

export function MarkdownRenderer({ 
  content, 
  className = '', 
  isStreaming = false, 
  randomChars = '',
  isLoading = false 
}: MarkdownRendererProps) {
  const isInverted = className.includes('prose-invert');

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className} ${isStreaming ? 'streaming-content' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code(props: CodeProps) {
            const { inline, className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');

            if (!inline && match) {
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-md"
                  showLineNumbers={false}
                  wrapLines={true}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }

            return (
              <code
                className={`${className || ''} ${
                  isInverted
                    ? 'bg-blue-700 text-blue-100'
                    : 'bg-gray-100 dark:bg-gray-800'
                } px-1 py-0.5 rounded text-sm`}
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre(props: ComponentProps) {
            return <div className="overflow-x-auto">{props.children}</div>;
          },
          table(props: ComponentProps) {
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                  {props.children}
                </table>
              </div>
            );
          },
          th(props: ComponentProps) {
            return (
              <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-semibold">
                {props.children}
              </th>
            );
          },
          td(props: ComponentProps) {
            return (
              <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                {props.children}
              </td>
            );
          },
          blockquote(props: ComponentProps) {
            return (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
                {props.children}
              </blockquote>
            );
          },
          h1(props: ComponentProps) {
            return <h1 className="text-2xl font-bold mb-4 mt-6">{props.children}</h1>;
          },
          h2(props: ComponentProps) {
            return <h2 className="text-xl font-bold mb-3 mt-5">{props.children}</h2>;
          },
          h3(props: ComponentProps) {
            return <h3 className="text-lg font-bold mb-2 mt-4">{props.children}</h3>;
          },
          ul(props: ComponentProps) {
            return <ul className="list-disc list-inside mb-4 space-y-1">{props.children}</ul>;
          },
          ol(props: ComponentProps) {
            return <ol className="list-decimal list-inside mb-4 space-y-1">{props.children}</ol>;
          },
          li(props: ComponentProps) {
            return <li className="mb-1">{props.children}</li>;
          },
          p(props: ComponentProps) {
            return <p className="my-0 leading-relaxed">{props.children}</p>;
          },
          a(props: LinkProps) {
            return (
              <a
                href={props.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:underline"
              >
                {props.children}
              </a>
            );
          },
          hr() {
            return (
              <hr className="my-4 border-gray-300 dark:border-gray-600" />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isLoading && randomChars && (
        <span className="random-chars" style={{animation: 'randomFade 1s infinite'}}>
          {randomChars}
        </span>
      )}
    </div>
  );
}
