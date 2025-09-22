'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import coy from 'react-syntax-highlighter/dist/cjs/styles/prism/coy';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


type CodeBlockProps = {
  language: string;
  code: string;
};

export function CodeBlock({ language, code }: CodeBlockProps) {
  const { theme } = useTheme();
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setHasCopied(true);
      toast({ title: 'Copied to clipboard' });
      setTimeout(() => setHasCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy code: ', err);
      toast({ title: 'Failed to copy', variant: 'destructive' });
    });
  };

  return (
    <div className="relative text-sm bg-muted rounded-lg overflow-hidden my-2">
      <div className="flex items-center justify-between px-4 py-1 bg-background/50 border-b">
        <span className="text-xs font-sans text-muted-foreground">{language}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
        >
          {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          <span className="sr-only">Copy code</span>
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={theme === 'dark' ? vscDarkPlus : coy}
        customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
        codeTagProps={{ style: { fontFamily: 'var(--font-code)' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
