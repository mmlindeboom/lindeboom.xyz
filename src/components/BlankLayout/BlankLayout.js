// @flow
import React from 'react';
import Helmet from 'react-helmet';
import type { Node as ReactNode } from 'react';


type Props = {
  children: ReactNode,
  title: string,
  description?: string
};

const BlankLayout = ({ children, title, description }: Props) => (
  <div>
    <Helmet>
      <html lang="en" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:site_name" content={title} />
    </Helmet>
    {children}
  </div>
);

export default BlankLayout;
