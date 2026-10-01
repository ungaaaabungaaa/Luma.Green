import type { AnchorHTMLAttributes } from "react";

type Destination =
  string | { pathname: string; query?: Record<string, string> };
function hrefOf(value: Destination) {
  if (typeof value === "string") return value;
  const query = value.query
    ? `?${new URLSearchParams(value.query).toString()}`
    : "";
  return `${value.pathname}${query}`;
}
export function Link({
  href,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Destination;
}) {
  return (
    <a href={hrefOf(href)} {...props}>
      {children}
    </a>
  );
}
const router = {
  push: (href: Destination) => {
    window.location.assign(hrefOf(href));
  },
  replace: (href: Destination) => {
    window.location.replace(hrefOf(href));
  },
};
export function useRouter() {
  return router;
}
export function usePathname() {
  return window.location.pathname.replace(/^\/en/u, "") || "/";
}
export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}
export default Link;
