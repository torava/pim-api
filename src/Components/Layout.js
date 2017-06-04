'use strict';

import React from 'react';
import {Link} from 'react-router';

export default class Layout extends React.Component {
  render() {
    return (
      <div className="app-container">
        <nav>
          <Link to="/">Receipts</Link>
          <Link to="/add/">Add</Link>
        </nav>
        <div className="app-content">{this.props.children}</div>
      </div>
    );
  }
}