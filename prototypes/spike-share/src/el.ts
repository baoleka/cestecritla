/**
 * Tiny element factory for satori. Satori accepts plain React-shaped objects
 * ({ type, props, key }), so no JSX transform is needed in the Worker build.
 */
import type { ReactElement } from 'react';

export type Style = Record<string, string | number>;

export type Child = El | string | number | null | undefined | false;

export interface ElProps {
  style?: Style;
  children?: Child | Child[];
  /** satori's line-clamp helper: { lineClamp: 2 } on a text node. */
  lang?: string;
}

export type El = ReactElement<ElProps, string>;

export const h = (type: string, style: Style, ...children: Child[]): El => ({
  type,
  key: null,
  props: { style, children: children.length === 1 ? children[0] : children },
});

/** A flex row/column container. Satori requires display:flex on every multi-child box. */
export const box = (style: Style, ...children: Child[]): El =>
  h('div', { display: 'flex', ...style }, ...children);

export const text = (style: Style, content: string): El => h('div', { display: 'flex', ...style }, content);
