// A tiny helper for building page elements in code.
//
//   el('button', { class: 'btn', onclick: start }, 'Start')
//
// Text is always inserted as plain text (never as HTML), so names typed by
// the player can't break the page.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
    else if (name === 'class') node.className = value;
    else if (name === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (value === true) node.setAttribute(name, '');
    else node.setAttribute(name, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// Replace everything inside `parent` with `children`.
export function replaceChildren(parent, ...children) {
  parent.replaceChildren(...children.flat().filter(Boolean));
}

// "#rrggbb" text from a colour number.
export function hexColor(n) {
  return `#${n.toString(16).padStart(6, '0')}`;
}
