import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number };
function icon(children: ReactNode) {
  return function Icon({ size = 18, strokeWidth = 1.8, ...props }: IconProps) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
  };
}

export const Armchair = icon(<><path d="M5 12V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M4 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2"/><path d="M5 18v3m14-3v3M4 12v-2m16 2v-2"/></>);
export const ArrowDownRight = icon(<path d="M7 7 17 17M7 17h10V7"/>);
export const ArrowRight = icon(<path d="M5 12h14m-6-6 6 6-6 6"/>);
export const Check = icon(<path d="m5 12 4 4L19 6"/>);
export const ChevronDown = icon(<path d="m6 9 6 6 6-6"/>);
export const Clapperboard = icon(<><path d="M4 6h16a2 2 0 0 1 2 2v12H2V8a2 2 0 0 1 2-2Z"/><path d="m2 11 20-4M7 6l3 5m3-6 3 5m3-6 3 5"/></>);
export const Film = icon(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18m10-18v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/></>);
export const Pencil = icon(<><path d="m16 4 4 4M4 20l4-.8L20 7a2.1 2.1 0 0 0-3-3L5 16Z"/><path d="m14 6 4 4"/></>);
export const Plus = icon(<path d="M12 5v14m-7-7h14"/>);
export const Popcorn = icon(<><path d="m5 8 2 13h10l2-13M4 8h16l-1-4H5Z"/><path d="M8 4v4m4-4v4m4-4v4m-6 4 1 7m4-7-1 7"/></>);
export const RotateCcw = icon(<><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/></>);
export const Ticket = icon(<><path d="M3 7a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h18a2 2 0 0 0 0-4v-2a2 2 0 0 0 0-4Z"/><path d="M13 7v2m0 3v2m0 3v2"/></>);
export const X = icon(<path d="m18 6-12 12M6 6l12 12"/>);
