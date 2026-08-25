/**
 * Compatibility layer so the app's existing react-router-dom call sites keep
 * working on top of TanStack Router.
 */
import * as React from "react";
import {
  Link as TanstackLink,
  useNavigate as useTanstackNavigate,
  useLocation as useTanstackLocation,
  useParams as useTanstackParams,
  useRouterState,
} from "@tanstack/react-router";

type AnyProps = Record<string, unknown>;

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  replace?: boolean;
  state?: unknown;
  children?: React.ReactNode;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state: _state, ...rest },
  ref,
) {
  const Any = TanstackLink as unknown as React.ComponentType<AnyProps>;
  return <Any ref={ref} to={to} replace={replace} {...(rest as AnyProps)} />;
});

type NavLinkState = { isActive: boolean; isPending: boolean };

export interface NavLinkProps extends Omit<LinkProps, "className" | "children"> {
  className?: string | ((props: NavLinkState) => string);
  children?: React.ReactNode | ((props: NavLinkState) => React.ReactNode);
  end?: boolean;
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, className, children, end, ...rest },
  ref,
) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const state: NavLinkState = { isActive, isPending: false };
  const resolvedClassName = typeof className === "function" ? className(state) : className;
  const resolvedChildren = typeof children === "function" ? children(state) : children;

  return (
    <Link ref={ref} to={to} className={resolvedClassName} {...rest}>
      {resolvedChildren}
    </Link>
  );
});

export function useNavigate() {
  const navigate = useTanstackNavigate();
  return React.useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        if (typeof window !== "undefined") window.history.go(to);
        return;
      }
      navigate({ to, replace: options?.replace } as never);
    },
    [navigate],
  );
}

export function useLocation() {
  const location = useTanstackLocation();
  return {
    pathname: location.pathname,
    search: location.searchStr ?? "",
    hash: location.hash ?? "",
    state: (location.state ?? {}) as unknown,
    key: location.href,
  };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useTanstackParams({ strict: false } as never) as T;
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | string) => void] {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const navigate = useTanstackNavigate();
  const params = React.useMemo(() => new URLSearchParams(searchStr ?? ""), [searchStr]);
  const setParams = React.useCallback(
    (next: URLSearchParams | string) => {
      const str = typeof next === "string" ? next : next.toString();
      navigate({ search: Object.fromEntries(new URLSearchParams(str)) } as never);
    },
    [navigate],
  );
  return [params, setParams];
}

export function Navigate({ to, replace = true }: { to: string; replace?: boolean; state?: unknown }) {
  const navigate = useTanstackNavigate();
  React.useEffect(() => {
    navigate({ to, replace } as never);
  }, [navigate, to, replace]);
  return null;
}
