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
        <title>MasterVoice Logo</title>
        <path 
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeMiterlimit="10" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M8.5 12H9.5C10.05 12 10.5 11.55 10.5 11V10C10.5 9.45 10.05 9 9.5 9H8.5C7.95 9 7.5 9.45 7.5 10V11C7.5 11.55 7.95 12 8.5 12Z" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeMiterlimit="10" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path 
            d="M15.5 15H14.5C13.95 15 13.5 14.55 13.5 14V13C13.5 12.45 13.95 12 14.5 12H15.5C16.05 12 16.5 12.45 16.5 13V14C16.5 14.55 16.05 15 15.5 15Z" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeMiterlimit="10" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
