import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>MasterVoice Logo</title>
      <path d="M2 7l5 5 5-5" />
      <path d="M12 12l5 5 5-5" />
      <path d="M7 12l-5-5" />
      <path d="M17 12l-5 5" />
    </svg>
  );
}
