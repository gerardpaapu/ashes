import { mount, html } from '../ashes.js'

/**
 * @typedef {{ count?: number }} State
 */

/**
 *
 * @param {object} param
 * @param {State} param.state
 * @param {(f: (old: State) => State) => void} param.setState
 * @returns {HTMLElement}
 */
function App({ state, setState }) {
  let count = state.count || 0

  let whatever = { class: 'farts', id: 'FartButton' }

  return html`
    <div class="app">
      <!-- comments -->
      <div>${count}</div>
      <${Butt} onclick=${() => setState(old => ({ count: (old.count || 0) + 1 }))} text="Up" />
      <${Butt} onclick=${() => setState(old => ({ count: (old.count || 0) - 1 }))} text="Down" />
      <button type="submit" value="Submit" ...${whatever}>Submit</button>
    </div>
  `
}

/**
 *
 * @param {object} params
 * @param {string} params.text
 * @param {() => void} params.onclick
 * @returns {HTMLElement}
 */
function Butt({ text, onclick }) {
  return html`<button onclick=${onclick}>${text}</button>`
}

mount(document.getElementById('App'), App, {}, {})
