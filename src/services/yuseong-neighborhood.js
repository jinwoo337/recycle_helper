const keyFor = member => `recycle-helper.yuseong-neighborhood.v1.${member?.id || 'guest'}`;

export function readYuseongNeighborhood(member) {
  try {
    const choice = JSON.parse(localStorage.getItem(keyFor(member)) || 'null');
    if (typeof choice?.neighborhood === 'string' && typeof choice.area === 'string') return choice;
  } catch { /* The selector still works when storage is unavailable. */ }
  return { neighborhood: '', area: '' };
}

export function rememberYuseongNeighborhood(member, choice) {
  try { localStorage.setItem(keyFor(member), JSON.stringify(choice)); } catch { /* The current choice is still shown. */ }
}
