// Pure CSR: the whole panel lives behind auth, there is no public page worth
// prerendering, so SEO and no-JS costs do not apply here.
// CSR puro: todo el panel vive detrás de auth, no hay página pública que valga
// la pena prerenderizar, así que el SEO y el costo de "sin JS" no aplican.
export const ssr = false;
export const prerender = false;
