import type { Action } from "svelte/action";

interface FocusTrapOptions {
  enabled?: boolean;
  onEscape?: () => void;
  initialFocus?: HTMLElement | null | (() => HTMLElement | null);
  additionalRoots?: Array<HTMLElement | null> | (() => Array<HTMLElement | null>);
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function getFocusableElements(containers: HTMLElement[]): HTMLElement[] {
  const result: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  for (const container of containers) {
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

    for (const el of focusable) {
      if (!seen.has(el)) {
        seen.add(el);
        result.push(el);
      }
    }
  }

  return result;
}

function resolveInitialFocus(
  initialFocus: FocusTrapOptions["initialFocus"]
): HTMLElement | null {
  if (typeof initialFocus === "function") {
    return initialFocus();
  }
  return initialFocus ?? null;
}

function resolveAdditionalRoots(
  additionalRoots: FocusTrapOptions["additionalRoots"]
): HTMLElement[] {
  const roots = typeof additionalRoots === "function"
    ? additionalRoots()
    : (additionalRoots ?? []);
  return roots.filter((root): root is HTMLElement => root instanceof HTMLElement);
}

export const focusTrap: Action<HTMLElement, FocusTrapOptions> = (
  node,
  options = {}
) => {
  let current = options;
  let previousActive: HTMLElement | null = null;
  let teardown: (() => void) | null = null;

  function cleanup() {
    teardown?.();
    teardown = null;
  }

  function activate() {
    cleanup();
    if (!current.enabled) return;

    previousActive = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const onKeyDown = (event: KeyboardEvent) => {
      const roots = [node, ...resolveAdditionalRoots(current.additionalRoots)];
      const target = event.target as Node | null;
      const isWithinTrap = !!target && roots.some((root) => root.contains(target));
      if (!isWithinTrap) return;

      if (event.key === "Escape") {
        event.stopPropagation();
        current.onEscape?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(roots);
      if (focusable.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !node.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    requestAnimationFrame(() => {
      const preferred = resolveInitialFocus(current.initialFocus);
      const roots = [node, ...resolveAdditionalRoots(current.additionalRoots)];
      const focusTarget = preferred ?? getFocusableElements(roots)[0] ?? node;
      focusTarget.focus();
    });

    teardown = () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previousActive && document.contains(previousActive)) {
        previousActive.focus();
      }
      previousActive = null;
    };
  }

  activate();

  return {
    update(next) {
      current = next ?? {};
      activate();
    },
    destroy() {
      cleanup();
    },
  };
};
