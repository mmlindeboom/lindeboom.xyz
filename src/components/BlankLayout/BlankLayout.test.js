// @flow
import React from 'react';
import renderer from 'react-test-renderer';
import BlankLayout from './BlankLayout';

describe('Layout', () => {
  const props = {
    children: 'test',
  };

  it('renders correctly', () => {
    const tree = renderer.create(<BlankLayout {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
