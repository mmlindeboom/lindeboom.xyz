import React, { PureComponent } from 'react';
import Helmet from 'react-helmet';
import { withPrefix } from 'gatsby';
import Layout from '../../components/Layout';

export default class extends PureComponent {
  render() {
    return (
        <div>
          <Helmet bodyAttributes={{
            class: 'periodic-table'
          }}>
            <html lang="en" />
            <meta name='viewport' content='width=device-width,initial-scale=1' />
            <title>Periodic Table</title>
            <link rel='stylesheet' href={withPrefix('pt/bundle.css')} />

            <script src={withPrefix('pt/bundle.js')}></script>
          </Helmet>
          <div className='pt-container'></div>
      </div>
    );
  }
}