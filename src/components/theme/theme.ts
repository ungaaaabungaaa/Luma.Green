export type ThemePreference = "light" | "dark" | "system";

export const themeStorageKey = "luma-theme";
export const themeMediaQuery = "(prefers-color-scheme: dark)";

export function parseTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** Runs in the document head before body paint, without waiting for React. */
export const themeBootstrap = `(()=>{let t="system";try{t=localStorage.getItem("${themeStorageKey}")||t}catch{}const d=t==="dark"||(t!=="light"&&matchMedia("${themeMediaQuery}").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"})()`;
