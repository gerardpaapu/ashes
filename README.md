# Ashes

Ashes is an experimental minimal component based UI framework.

You probably don't want to use it for anything, try preact instead

The basic idea is that there is one "setState" function that is passed to the root component.

When called `setState` will re-render the whole component tree from the root. This is not efficient.

A "component" is any function that produces an `HTMLElement`, there's no memoisation (yet) or vdom.

I provide a template function to make writing markup easier.







