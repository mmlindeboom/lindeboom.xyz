import React from 'react';
import Helmet from 'react-helmet';
import ProjectLayout from '../../components/Layout/ProjectLayout';
import { withPrefix } from 'gatsby';

export default ({ children }) => (
  <ProjectLayout>
    <Helmet>
      <meta charset='utf-8' />
      <meta name='viewport' content='width=device-width,initial-scale=1' />
      <title>Periodic Table</title>
      <link rel='stylesheet' href={withPrefix('pt/bundle.css')} />

      <script defer src={withPrefix('pt/bundle.js')}></script>
    </Helmet>

    {children}
  </ProjectLayout>

);