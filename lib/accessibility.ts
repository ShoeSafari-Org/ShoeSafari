/**
 * Accessibility Utilities
 *
 * Helper functions and constants for improving accessibility
 * throughout the ShoeSafari application.
 */

// =============================================================================
// Keyboard Navigation
// =============================================================================

/**
 * Common keyboard keys used for navigation.
 */
export const Keys = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
} as const;

/**
 * Checks if an element is focusable.
 */
export function isFocusable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  // Check if element is disabled
  if ((element as HTMLButtonElement).disabled) return false;

  // Check tabindex
  const tabindex = element.getAttribute("tabindex");
  if (tabindex && parseInt(tabindex) < 0) return false;

  // Check for naturally focusable elements
  const focusableTags = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
  if (focusableTags.includes(element.tagName)) return true;

  // Check for elements with positive tabindex
  if (tabindex && parseInt(tabindex) >= 0) return true;

  return false;
}

/**
 * Gets all focusable elements within a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  return Array.from(elements).filter(
    (el) => isFocusable(el) && isVisible(el as HTMLElement)
  ) as HTMLElement[];
}

/**
 * Checks if an element is visible.
 */
export function isVisible(element: HTMLElement): boolean {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

/**
 * Traps focus within a container (useful for modals).
 */
export function trapFocus(container: HTMLElement): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== Keys.TAB) return;

    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      event.preventDefault();
      container.focus();
      return;
    }

    if (event.shiftKey) {
      if (document.activeElement === firstElement || document.activeElement === container) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement || document.activeElement === container) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  const keepFocusInside = (event: FocusEvent) => {
    if (event.target instanceof Node && !container.contains(event.target)) {
      (getFocusableElements(container)[0] ?? container).focus();
    }
  };

  container.addEventListener("keydown", handleKeyDown);
  document.addEventListener("focusin", keepFocusInside);

  (getFocusableElements(container)[0] ?? container).focus();

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("focusin", keepFocusInside);
  };
}

// =============================================================================
// ARIA Helpers
// =============================================================================

/**
 * Generates a unique ID for ARIA relationships.
 */
export function generateAriaId(prefix = "aria"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Creates ARIA props for a button that controls expandable content.
 */
export function ariaExpanded(isExpanded: boolean, controlsId: string) {
  return {
    "aria-expanded": isExpanded,
    "aria-controls": controlsId,
  };
}

/**
 * Creates ARIA props for a live region (for screen reader announcements).
 */
export function ariaLive(priority: "polite" | "assertive" = "polite") {
  return {
    "aria-live": priority,
    "aria-atomic": true,
  };
}

/**
 * Creates ARIA props for an invalid form field.
 */
export function ariaInvalid(
  isInvalid: boolean,
  errorId?: string
): Record<string, string | boolean> {
  const props: Record<string, string | boolean> = {
    "aria-invalid": isInvalid,
  };

  if (isInvalid && errorId) {
    props["aria-describedby"] = errorId;
  }

  return props;
}

// =============================================================================
// Screen Reader Utilities
// =============================================================================

/**
 * Announces a message to screen readers.
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * CSS class for visually hidden but screen-reader accessible content.
 * Include this in your global CSS or Tailwind config.
 */
export const srOnlyStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`;

// =============================================================================
// Focus Management
// =============================================================================

/**
 * Saves the currently focused element and returns a function to restore it.
 */
export function saveFocus(): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  return () => {
    previouslyFocused?.focus();
  };
}

/**
 * Moves focus to the first error in a form.
 */
export function focusFirstError(container: HTMLElement): void {
  const errorElement = container.querySelector('[aria-invalid="true"]');
  if (errorElement instanceof HTMLElement) {
    errorElement.focus();
  }
}

// =============================================================================
// Reduced Motion
// =============================================================================

/**
 * Checks if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Gets animation duration respecting reduced motion preference.
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

// =============================================================================
// Color Contrast
// =============================================================================

/**
 * Checks if a color combination meets WCAG AA contrast requirements.
 * Note: This is a simplified check. For production, use a proper contrast library.
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  largeText = false
): boolean {
  // This is a placeholder. In production, implement proper contrast calculation.
  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text.
  console.warn("meetsContrastRequirement is a placeholder. Implement proper contrast checking.");
  return true;
}
