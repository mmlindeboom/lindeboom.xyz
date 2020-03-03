import React from 'react';
import Helmet from 'react-helmet';
import { withPrefix } from 'gatsby';
import Layout from '../../components/Layout';

export default () => (
  <Layout>
    <Helmet bodyAttributes={{
      class: 'periodic-table'
    }}>
      <html lang="en" />
      <title>Periodic Table</title>
      <meta name='viewport' content='width=device-width,initial-scale=1' />
      <title>Periodic Table</title>
      <link rel='stylesheet' href={withPrefix('pt/bundle.css')} />

      <script defer src={withPrefix('pt/bundle.js')}></script>
    </Helmet>
    <div className='pt-container' ></div>
  </Layout>
);