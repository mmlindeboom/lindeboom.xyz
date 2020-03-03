'use strict';
import { withPrefix } from 'gatsby';
export function onRouteUpdate({ location }) {
  if (location.pathname === withPrefix('/')) {
    require('./src/assets/scss/init.scss');
  }
}


export const onClientEntry = () => {};
