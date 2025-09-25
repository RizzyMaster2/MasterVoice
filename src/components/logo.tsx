import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <style>
            {`
                .logo-circle, .logo-wave, .logo-line {
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    stroke-width: 1.5;
                }
                .logo-circle {
                    stroke-dasharray: 251;
                    stroke-dashoffset: 251;
                    animation: draw-circle 1s ease-in-out forwards;
                }
                .logo-wave, .logo-line {
                    opacity: 0;
                    animation: fade-in 0.6s ease-in-out forwards;
                }
                .logo-wave-1 { animation-delay: 0.5s; }
                .logo-wave-2 { animation-delay: 0.7s; }
                .logo-line { animation-delay: 0.9s; }

                @keyframes draw-circle {
                    to { stroke-dashoffset: 0; }
                }
                @keyframes fade-in {
                    to { opacity: 1; }
                }
            `}
        </style>
        <title>MasterVoice Logo</title>
        <path 
            className="logo-circle"
            d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
            stroke="currentColor" 
        />
        <path 
            className="logo-wave logo-wave-1"
            d="M8.5 12C8.5 11.1716 9.17157 10.5 10 10.5H10.5" 
            stroke="currentColor"
        />
        <path 
            className="logo-wave logo-wave-2"
            d="M15.5 12C15.5 12.8284 14.8284 13.5 14 13.5H13.5" 
            stroke="currentColor"
        />
        <path 
            className="logo-line"
            d="M10.5 10.5L13.5 13.5" 
            stroke="currentColor"
        />
    </svg>
  );
}
