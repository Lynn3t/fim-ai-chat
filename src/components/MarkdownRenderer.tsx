'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const isInverted = className.includes('prose-invert');

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code(props: any) {
            const { inline, className, children } = props;
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="rounded-md"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className} ${
                isInverted
                  ? 'bg-blue-700 text-blue-100'
                  : 'bg-gray-100 dark:bg-gray-800'
              } px-1 py-0.5 rounded text-sm`}>
                {children}
              </code>
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pre(props: any) {
            return <div className="overflow-x-auto">{props.children}</div>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          table(props: any) {
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                  {props.children}
                </table>
              </div>
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          th(props: any) {
            return (
              <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-semibold">
                {props.children}
              </th>
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          td(props: any) {
            return (
              <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                {props.children}
              </td>
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          blockquote(props: any) {
            return (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
                {props.children}
              </blockquote>
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          h1(props: any) {
            return <h1 className="text-2xl font-bold mb-4 mt-6">{props.children}</h1>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          h2(props: any) {
            return <h2 className="text-xl font-bold mb-3 mt-5">{props.children}</h2>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          h3(props: any) {
            return <h3 className="text-lg font-bold mb-2 mt-4">{props.children}</h3>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ul(props: any) {
            return <ul className="list-disc list-inside mb-4 space-y-1">{props.children}</ul>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ol(props: any) {
            return <ol className="list-decimal list-inside mb-4 space-y-1">{props.children}</ol>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          li(props: any) {
            return <li className="mb-1">{props.children}</li>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p(props: any) {
            return <p className="mb-3 leading-relaxed">{props.children}</p>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          a(props: any) {
            return (
              <a
                href={props.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
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
    </div>
  );
}
