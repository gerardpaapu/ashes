import makeHtml from './html/html.js'
import * as S from './html/symbols.js'

/**
 * @template T
 * @template P
 * @param {HTMLElement | null} root
 * @param {(_: { state: T, setState: (_: T | ((prev: T) => T)) => void } & P) => HTMLElement} component
 * @param {T} state
 * @param {P} params
 */
export function mount(root, component, state, params) {
  root?.replaceChildren(
    component({
      state,
      setState: (f) =>
        typeof f === 'function'
          ? mount(root, component, f(state), params)
          : mount(root, component, f, params),
      ...params,
    })
  )
}

export const html = makeHtml((tagName, attr, children) => {
  let element

  if (typeof tagName === 'function') {
    element = tagName({ ...attr, children })
  } else if (tagName === S.TEXT || tagName === S.ENTITY) {
    if (typeof children !== 'string') {
      throw new Error()
    }
    element = document.createTextNode(children)
  } else if (typeof tagName === 'string') {
    element = document.createElement(tagName)
    if (attr != null) {
      for (const [key, value] of Object.entries(attr)) {
        if (key.startsWith('on')) {
          element.addEventListener(key.slice(2), value)
        } else {
          element.setAttribute(key, value)
        }
      }
    }

    if (!Array.isArray(children)) {
      throw new Error()
    }

    let realChildren = children.map((item) => {
      if (item instanceof Node) {
        return item
      }

      if (typeof item === 'number' || typeof item === 'string') {
        return document.createTextNode(String(item))
      }
      throw new Error()
    })

    element.replaceChildren(...realChildren)
  }

  return element
})
