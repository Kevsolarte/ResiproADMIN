import { redirect } from '@sveltejs/kit';

// The app has no public landing page: everything lives behind auth. This load
// runs before anything renders, so there is no flash of an empty page.
// La app no tiene landing pública: todo vive detrás de auth. Este load corre
// antes de renderizar nada, así que no hay parpadeo de una página vacía.
export const load = () => {
	redirect(307, '/panel');
};
