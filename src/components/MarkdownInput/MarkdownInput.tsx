'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import dynamic from 'next/dynamic';

/* Module imports -------------------------------------- */
import { useTheme } from 'next-themes';

/* Component imports ----------------------------------- */
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'components/ui/tabs';
import { Skeleton } from 'components/ui/skeleton';
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';

/* Type imports ---------------------------------------- */
import type { EditorProps } from '@monaco-editor/react';

/* Lazy Monaco ----------------------------------------- */
// Monaco core is fetched from a CDN at runtime by @monaco-editor/loader, so the
// bundle cost is negligible; it must stay client-only (no SSR path).
const MonacoEditor = dynamic(
  async (): Promise<React.ComponentType<EditorProps>> => (await import('@monaco-editor/react')).Editor,
  {
    ssr: false,
    loading: (): React.ReactElement => <Skeleton className="h-full w-full rounded-md" />,
  },
);

/* MarkdownInput component prop types ------------------ */
interface MarkdownInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: number;
  disabled?: boolean;
  invalid?: boolean;
}

/* Constants ------------------------------------------- */
const EDITOR_OPTIONS: EditorProps['options'] = {
  wordWrap: 'on',
  minimap: { enabled: false },
  lineNumbers: 'off',
  folding: false,
  scrollBeyondLastLine: false,
  scrollbar: { alwaysConsumeMouseWheel: false },
  overviewRulerLanes: 0,
  renderLineHighlight: 'none',
  padding: { top: 8, bottom: 8 },
  fontSize: 14,
  tabSize: 2,
};

/* MarkdownInput component ----------------------------- */
const MarkdownInput: React.FC<MarkdownInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  minHeight = 200,
  disabled = false,
  invalid = false,
}) => {
  const { resolvedTheme } = useTheme();
  const monacoTheme: string = resolvedTheme === 'dark' ? 'vs-dark' : 'vs';

  const handleEditorChange = (next: string | undefined): void => {
    const text: string = next ?? '';
    onChange(maxLength !== undefined ? text.slice(0, maxLength) : text);
  };

  const overLimit: boolean = maxLength !== undefined && value.length > maxLength;

  return (
    <div id={id}>
      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Éditer</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <div
            className="overflow-hidden rounded-md border border-input aria-invalid:border-destructive"
            aria-invalid={invalid}
            style={{ height: minHeight }}
          >
            <MonacoEditor
              language="markdown"
              theme={monacoTheme}
              value={value}
              onChange={handleEditorChange}
              options={{ ...EDITOR_OPTIONS, readOnly: disabled }}
              loading={<Skeleton className="h-full w-full rounded-md" />}
            />
          </div>
          {
            placeholder !== undefined && value.length === 0 &&
              <p className="mt-1 text-xs text-muted-foreground">
                {placeholder}
              </p>
          }
        </TabsContent>
        <TabsContent value="preview">
          <div
            className="event-description overflow-auto rounded-md border border-input px-4 py-2"
            style={{ minHeight }}
          >
            {
              value.length > 0
                ? <DescriptionRender markdown={value} />
                : <p className="text-sm text-muted-foreground">Rien à prévisualiser</p>
            }
          </div>
        </TabsContent>
      </Tabs>
      {
        maxLength !== undefined &&
          <p className={`mt-1 text-right text-xs ${overLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
            {value.length} / {maxLength}
          </p>
      }
    </div>
  );
};

/* Export MarkdownInput component ---------------------- */
export default MarkdownInput;
