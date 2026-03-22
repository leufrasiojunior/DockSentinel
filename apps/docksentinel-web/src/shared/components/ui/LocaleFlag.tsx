import { type ComponentType, type SVGProps } from "react";
import { type Locale } from "../../../i18n/locale";

function FlagBrazil(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect width="64" height="64" rx="32" fill="#009B3A" />
      <path d="M32 12 54 32 32 52 10 32Z" fill="#FFDF00" />
      <circle cx="32" cy="32" r="11.5" fill="#002776" />
      <path
        d="M22.5 28.9c2.8-2.2 6.1-3.4 9.5-3.4 4.1 0 8 1.7 10.8 4.7"
        fill="none"
        stroke="#FFF"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FlagUsa(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect width="64" height="64" rx="32" fill="#fff" />
      <path d="M0 8h64v8H0zm0 16h64v8H0zm0 16h64v8H0zm0 16h64v8H0z" fill="#B22234" />
      <path d="M0 0h30v34H0z" fill="#3C3B6E" />
      <g fill="#fff">
        <circle cx="6" cy="6" r="1.7" />
        <circle cx="14" cy="6" r="1.7" />
        <circle cx="22" cy="6" r="1.7" />
        <circle cx="10" cy="12" r="1.7" />
        <circle cx="18" cy="12" r="1.7" />
        <circle cx="26" cy="12" r="1.7" />
        <circle cx="6" cy="18" r="1.7" />
        <circle cx="14" cy="18" r="1.7" />
        <circle cx="22" cy="18" r="1.7" />
        <circle cx="10" cy="24" r="1.7" />
        <circle cx="18" cy="24" r="1.7" />
        <circle cx="26" cy="24" r="1.7" />
      </g>
    </svg>
  );
}

const LOCALE_FLAGS: Record<Locale, ComponentType<SVGProps<SVGSVGElement>>> = {
  "pt-BR": FlagBrazil,
  "en-US": FlagUsa,
};

export function LocaleFlag({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const Flag = LOCALE_FLAGS[locale];
  return <Flag className={className} />;
}

