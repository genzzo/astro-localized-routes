export const VIRTUAL_ID = "virtual:astro-localized-routes";
export const VIRTUAL_INTERNAL_ID = "astro-localized-routes:internal:virtual";
export const RESOLVED_INTERNAL_ID = `\0${VIRTUAL_INTERNAL_ID}`;

// the routes Astro uses for server islands and for actions called from the browser
export const SERVER_ISLAND_ROUTE = "/_server-islands/[name]";
export const ACTION_RPC_ROUTE = "/_actions/[...path]";
