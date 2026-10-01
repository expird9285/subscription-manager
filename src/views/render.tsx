import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import type { Child } from "hono/jsx";

import { SIDEBAR_COOKIE } from "../auth/session";
import type { AppEnv } from "../lib/types";
import { AppShell, Document } from "./layout";

type HtmlStatus = 200 | 400 | 404 | 500;

export async function renderDocument(c: Context, page: Child, status: HtmlStatus = 200) {
  return c.html(`<!DOCTYPE html>${await page}`, status);
}

/** Renders a page inside the signed-in app shell (navigation + main area). */
export function renderApp(c: Context<AppEnv>, title: string, content: Child, status: HtmlStatus = 200) {
  return renderDocument(
    c,
    <Document title={title}>
      <AppShell
        user={c.get("user")}
        pathname={new URL(c.req.url).pathname}
        sidebarCollapsed={getCookie(c, SIDEBAR_COOKIE) === "collapsed"}
      >
        {content}
      </AppShell>
    </Document>,
    status,
  );
}
