// Tiny DOM builder: h('div.card', { onclick }, 'text', child) → HTMLElement.
type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown> & { style?: Partial<CSSStyleDeclaration> | string };

export function h(tag: string, props?: Props | Child, ...children: Child[]): HTMLElement {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  let kids = children;
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) kids = [props as Child, ...children];
  else if (props) {
    for (const [k, v] of Object.entries(props as Props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, kids);
  return el;
}

function append(el: HTMLElement, kids: Child[]): void {
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: HTMLElement): HTMLElement {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
