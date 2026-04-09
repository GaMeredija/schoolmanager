export const isStaticDemo = import.meta.env.VITE_STATIC_DEMO === "true";

export function getDemoHomeUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}#/`;
}
