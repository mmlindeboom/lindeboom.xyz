// @flow
import React from 'react';
import Helmet from 'react-helmet';
import type { Node as ReactNode } from 'react';
import { withPrefix } from 'gatsby';

type Props = {
  children: ReactNode,
  title: string,
  description?: string
};

const ProjectLayout = ({ children, title, description }: Props) => (
  <div>
    <Helmet bodyAttributes={{
      class: 'periodic-table'
    }}>
      <html lang="en" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:site_name" content={title} />
      <meta name='viewport' content='width=device-width,initial-scale=1' />
      <title>Periodic Table</title>
      <link rel='stylesheet' href={withPrefix('pt/bundle.css')} />

      <script defer src={withPrefix('pt/bundle.js')}></script>
    </Helmet>

  </div>
);

export default ProjectLayout;
