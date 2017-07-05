'use strict';

import React from 'react';
import {NavLink} from 'react-router';

export default class NotFoundPage extends React.Component {
  render() {
    return (
      <div className="not-found">
        <h1>Page Not Found</h1>
        <NavLink exact to="/">Go Home</NavLink>
      </div>
    );
  }
};