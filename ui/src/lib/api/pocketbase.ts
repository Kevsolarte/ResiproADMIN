import PocketBase from 'pocketbase';

// In dev the SvelteKit server (5173) and PocketBase (8090) are separate origins.
// Once the build is embedded into the Go binary they share one, so the URL is
// overridable through VITE_PB_URL instead of being hardcoded.
// En dev el server de SvelteKit (5173) y PocketBase (8090) son orígenes
// distintos. Cuando el build quede embebido en el binario de Go comparten uno,
// así que la URL se puede sobreescribir con VITE_PB_URL.
const PB_URL = import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090';

// A single client for the whole app: it owns the auth token and persists it in
// localStorage by itself, syncing across tabs.
// Un solo cliente para toda la app: es dueño del token de auth y lo persiste
// solo en localStorage, sincronizando entre pestañas.
export const pb = new PocketBase(PB_URL);
