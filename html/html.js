import * as Token from './token-type.js'
import * as Context from './context-type.js'
import * as Symbols from './symbols.js'

/**
 * @param {string} ch
 * @returns {boolean}
 */
function isLetter(ch) {
  return ('a' <= ch && ch <= 'z') || ('A' <= ch && ch <= 'Z')
}

/**
 * @param {string} ch
 * @returns {boolean}
 */
function isTagName(ch) {
  return 'a' <= ch && ch <= 'z'
}

/**
 * @param {string} ch
 * @returns {boolean}
 */
function isWhiteSpace(ch) {
  return ch === ' ' || ch === '\t' || ch === 'h' || ch === '\n' || ch === '\r'
}

/**
 * @param {string} ch
 * @returns {boolean}
 */
function isPlainText(ch) {
  return ch !== '<' && ch !== '>' && ch !== '&' && ch !== '"' && ch !== "'"
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipWhitespace(src, i) {
  while (i < src.length && isWhiteSpace(src.charAt(i))) {
    i++
  }

  return i
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipComment(src, i) {
  let minimum = i + `<!---->`.length // I think an html comment has to be at least this long?
  if (src.length < minimum || src.slice(i, i + 4) !== '<!--') {
    return i
  }

  i += 4 // skip the comment start
  i += 3 // might as well look for the last character of the comment
  for (; ;) {
    while (src.length > i && src.charAt(i) !== '>') {
      console.log('skipping in comment', src.charAt(i))
      i++
    }

    if (src.charAt(i) !== '>') {
      throw new Error('unexpected end of input in comment')
    }
    i++ // skip the >

    if (src.charAt(i - 3) === '-' && src.charAt(i - 2) === '-') {
      // if that was the close of a comment, we can get out of here
      return i
    }
  }
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipCommentsAndWhiteSpace(src, i) {
  while (
    src.length > i &&
    (isWhiteSpace(src.charAt(i)) ||
      (src.charAt(i) === '<' && src.charAt(i + 1) === '!'))
  ) {
    i = skipWhitespace(src, i)
    i = skipComment(src, i)
  }

  return i
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipEntity(src, i) {
  i = src.indexOf(';', i)
  if (i === -1) {
    throw new Error('Malformed entity')
  }
  return i + 1
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipTagName(src, i) {
  while (i < src.length && isTagName(src.charAt(i))) {
    i++
  }

  return i
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipText(src, i) {
  while (i < src.length && isPlainText(src.charAt(i))) {
    i++
  }

  return i
}

/**
 * @param {string} ch
 * @returns {boolean}
 */
function isPropName(ch) {
  return isLetter(ch) || ch === '-'
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipPropName(src, i) {
  while (i < src.length && isPropName(src.charAt(i))) {
    i++
  }

  return i
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipClosingTag(src, i) {
  if (src.charAt(i) !== '/') {
    throw new Error('How did we get here?')
  }

  while (i < src.length && src.charAt(i) !== '>') {
    i++
  }

  if (src.charAt(i) !== '>') {
    throw new Error('Unexpected end of closing tag')
  }
  i++
  return i
}

/**
 *
 * @param {string} src
 * @param {number} i
 * @returns {number}
 */
function skipAttributeValue(src, i) {
  // must be '"'
  if (src.charAt(i) !== '"') {
    throw new Error('Expected attribute value double-quote')
  }
  i++

  while (i < src.length && src.charAt(i) !== '"') {
    i++
  }

  if (src.charAt(i) !== '"') {
    throw new Error('Unexpected end of attribute value')
  }
  i++
  return i
}
/**
 * @typedef {typeof Token[keyof typeof Token]} TokenType
 */
/**
 * @typedef {[TokenType] | [TokenType, unknown]} Token
 */


/**
 * @param {TemplateStringsArray} strings
 * @param  {...unknown} values
 * @returns {IterableIterator<Token>}
 */
function* tokenize(strings, ...values) {
  let s = 0
  let v = 0

  let ctx = Context.TOP_LEVEL
  let i = 0

  while (s < strings.length) {
    for (; ;) {
      if (s >= strings.length) {
        return
      }

      let src = strings[s]
      switch (ctx) {
        case Context.TOP_LEVEL: {
          i = skipCommentsAndWhiteSpace(src, i)
          // The src string has ended so this is either
          // the end or it's a value
          if (src.length <= i) {
            if (values.length <= v) {
              return
            }

            const value = values[v++]
            yield [Token.VALUE_NODE, value]
            s++
            i = 0
            continue
          }

          // reading a start tag, an entity or a text-node
          switch (src.charAt(i)) {
            case '<': {
              i++
              if (i < src.length && src.charAt(i) === '>') {
                // this is a fragment
                i++
                yield [Token.OPEN_TAG_FRAGMENT]
                ctx = Context.TOP_LEVEL
                continue
              }

              if (i < src.length && src.charAt(i) === '/') {
                // we're reading a closing tag it looks like
                if (src.length === i + 1) {
                  // a component function in a closing tag is legal, but we don't use it for anything
                  // .e.g. `</${Component}>`
                  // ignore this value
                  v++
                  src = strings[++s]
                  i = 0
                  i = skipWhitespace(src, i)
                  if (src.charAt(i) !== '>') {
                    throw new Error('Weird closing tag for sure')
                  }
                } else {
                  i = skipClosingTag(src, i)
                }

                yield [Token.CLOSE_TAG]
                ctx = Context.TOP_LEVEL
                continue
              }

              yield [Token.OPEN_TAG_START]
              ctx = Context.TAG_NAME

              continue
            }

            case '&': {
              let start = i
              i = skipEntity(src, i)
              yield [Token.ENTITY, src.slice(start, i)]
              ctx = Context.TOP_LEVEL
              continue
            }

            default: {
              let start = i
              i = skipText(src, i)
              yield [Token.TEXT_NODE, src.slice(start, i)]
              ctx = Context.TOP_LEVEL
              continue
            }
          }
        }

        case Context.TAG_NAME: {
          if (src.length <= i) {
            const name = values[v++]
            yield [Token.VALUE_TAG_NAME, name]
            s++
            i = 0
            ctx = Context.ATTRIBUTES
            continue
          }

          let start = i
          i = skipTagName(src, i)
          yield [Token.TAG_NAME, src.slice(start, i)]
          ctx = Context.ATTRIBUTES
          continue
        }

        case Context.ATTRIBUTES: {
          i = skipWhitespace(src, i)
        
          if (src.length === i + 3 &&
            src.slice(i, i + 3) === '...'
          ) {
            const value = values[v++]
            yield [Token.VALUE_ATTRIBUTES, value]
            s++
            i = 0
            ctx = Context.ATTRIBUTES
            continue
          }

          if (src.charAt(i) === '/') {
            i++
            if (src.charAt(i) !== '>') {
              throw new Error(`Expected end of self-closing tag at ${i}`)
            }
            i++
            yield [Token.OPEN_TAG_SELF_CLOSING_END]
            ctx = Context.TOP_LEVEL
            continue
          }

          if (src.charAt(i) === '>') {
            i++
            yield [Token.OPEN_TAG_END]
            ctx = Context.TOP_LEVEL
            continue
          }

         

          if (!isLetter(src.charAt(i))) {
            throw new Error('')
          }

          let start = i
          i = skipPropName(src, i)
          yield [Token.ATTR_NAME, src.slice(start, i)]
          ctx = Context.ATTRIBUTE_EQUALS
          continue
        }

        case Context.ATTRIBUTE_EQUALS: {
          if (src.length <= i || src.charAt(i) !== '=') {
            ctx = Context.ATTRIBUTES
          } else {
            i++ // skip the '='
            yield [Token.ATTR_EQUAL]
            ctx = Context.ATTRIBUTE_VALUE
          }
          continue
        }

        case Context.ATTRIBUTE_VALUE: {
          if (src.length <= i) {
            const value = values[v++]
            yield [Token.VALUE_ATTR_VALUE, value]
            i = 0
            s++

            ctx = Context.ATTRIBUTES
            continue
          }

          let start = i
          i = skipAttributeValue(src, i)
          yield [Token.ATTR_VALUE, src.slice(start, i)]
          ctx = Context.ATTRIBUTES
          continue
        }
      }
    }
  }
}
/**
 * @typedef {(props: Props) => HTMLElement} Component<Props>
 * @template Props
 */


/** @typedef {(string | Component<any> | typeof Symbols.FRAGMENT)} TagName  */
/**
 * @template Child
 * @typedef {(tagName: TagName, attr: Record<string, any> | null, children: Child[]) => Child} H1
 **/
/**
 * @template Child
 * @typedef {(tagName: typeof Symbols.TEXT | typeof Symbols.ENTITY, attr: null, children: string) => Child} H2
 */
/**
 * @template T
 * @typedef {H1<T> & H2<T>} H<T>*/
/**
 * @template Child
 * @param {H<Child>} h
 * @param {Iterator<Token>} tokens
 * @returns {Child | typeof Token.CLOSE_TAG}
 */
function readNode(h, tokens) {
  let { value } = tokens.next()
  let [type, content] = value
  switch (type) {
    case Token.CLOSE_TAG:
      return Token.CLOSE_TAG

    case Token.VALUE_NODE:
      return /** @type {Child} */ (/** @type {any} */ content)

    case Token.TEXT_NODE:
      // TODO: this should return a string to be consistent with `h`
      return h(Symbols.TEXT, null, content)

    case Token.ENTITY:
      // TODO: this should return a string to be consistent with `h`
      return h(Symbols.ENTITY, null, content)

    case Token.OPEN_TAG_FRAGMENT: {
      let children = readChildren(h, tokens)
      return h(Symbols.FRAGMENT, null, children)
    }

    case Token.OPEN_TAG_START: {
      let tagName = readTagName(tokens)
      let [attributes, { closed }] = readAttributes(tokens)
      let children = closed ? [] : readChildren(h, tokens)

      return h(tagName, attributes, children)
    }

    default:
      throw new Error()
  }
}

/**
 * @template T
 * @param {Iterator<Token>} tokens
 * @returns {string | T}
 */
function readTagName(tokens) {
  let { done, value } = tokens.next()
  let [type, content] = value

  if (done) {
    throw new Error('Expected tag name')
  }

  // TODO: different types should be different
  return content
}

/**
 * @template T
 * @param {Iterator<Token>} tokens
 * @returns {[Record<string, T | boolean>, { closed?: boolean }]}
 */
function readAttributes(tokens) {
  let attr = (/** @type {Record<string, T | boolean>} */({})) // Map?
  let name
  for (; ;) {
    let { done, value } = tokens.next()
    let [type, content] = value
    if (done) {
      throw new Error()
    }

    switch (type) {
      case Token.OPEN_TAG_SELF_CLOSING_END:
        return [attr, { closed: true }]

      case Token.OPEN_TAG_END:
        return [attr, { closed: false }]

      case Token.VALUE_ATTRIBUTES:
        Object.assign(attr, content)
        break

      case Token.ATTR_NAME:
        if (name != null) {
          attr[name] = true
        }
        name = content
        break

      case Token.ATTR_EQUAL:
        if (name === null) {
          throw new Error('dangling equal sign in prop')
        }
        break

      case Token.VALUE_ATTR_VALUE:
      case Token.ATTR_VALUE:
        if (name === null) {
          throw new Error('weird prop')
        }
        attr[name] = content
        name = null
        break
    }
  }
}

/**
 * @template T
 * @param {H<T>} h
 * @param {Iterator<Token>} tokens
 * @returns {T[]}
 */
function readChildren(h, tokens) {
  let children = []
  for (; ;) {
    let child = readNode(h, tokens)
    if (child === Token.CLOSE_TAG) {
      return children
    }

    children.push(child)
  }
}

/**
 * @template T
 * @param {H<T>} h
 * @returns {(strings: TemplateStringsArray, ...values: unknown[]) => T}
 */
export default function html(h) {
  return (strings, ...values) => {
    const node = readNode(h, tokenize(strings, ...values))
    if (node === Token.CLOSE_TAG) {
      throw new Error()
    }

    return node
  }
}
