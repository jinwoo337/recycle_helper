export const GUIDE_SECTIONS = ['pet', 'plastic', 'paper', 'carton', 'glass', 'can', 'vinyl', 'foam'];

export function parseRoute(hash = '') {
  const value = hash.replace(/^#/, '') || '/';
  const legacy = /^guide-([a-z]+)$/.exec(value);
  if (legacy && GUIDE_SECTIONS.includes(legacy[1])) return { path: '/guide', section: legacy[1] };
  const [path, query = ''] = value.split('?');
  const section = new URLSearchParams(query).get('material');
  return { path: query && path !== '/guide' ? value : path, section: path === '/guide' && GUIDE_SECTIONS.includes(section) ? section : null };
}
