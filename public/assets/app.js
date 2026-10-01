// Progressive enhancement for the server-rendered pages: navigation toggles and
// confirmation prompts. Everything else works with plain HTML forms and links.
(() => {
  const shell = document.querySelector("[data-shell]");

  function toggleSidebar(button) {
    if (!shell) return;
    const collapse = shell.dataset.sidebar !== "collapsed";
    shell.dataset.sidebar = collapse ? "collapsed" : "expanded";
    button.setAttribute("aria-expanded", String(!collapse));
    button.setAttribute("aria-label", collapse ? "사이드바 펼치기" : "사이드바 접기");
    document.cookie = `sm_sidebar=${collapse ? "collapsed" : "expanded"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  function toggleMobileMenu(button) {
    const header = button.closest("[data-mobile-nav]");
    const panel = document.getElementById(button.getAttribute("aria-controls") || "");
    if (!header || !panel) return;
    const open = header.dataset.open !== "true";
    header.dataset.open = String(open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    panel.inert = !open;
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const sidebarButton = target?.closest("[data-sidebar-toggle]");
    if (sidebarButton) {
      toggleSidebar(sidebarButton);
      return;
    }
    const mobileButton = target?.closest("[data-mobile-toggle]");
    if (mobileButton) {
      toggleMobileMenu(mobileButton);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const button = document.querySelector('[data-mobile-nav][data-open="true"] [data-mobile-toggle]');
    if (button) toggleMobileMenu(button);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    const message = form instanceof HTMLFormElement ? form.dataset.confirm : undefined;
    if (message && !window.confirm(message)) {
      event.preventDefault();
    }
  });
})();
