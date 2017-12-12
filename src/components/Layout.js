'use strict';

import React from 'react';
import {Link} from 'react-router-dom';

export default class Layout extends React.Component {
  render() {
    return (
      <div className="app-container">
        <nav>
          <Link to="/">Receipts</Link>&nbsp;
          <Link to="/items">Items</Link>&nbsp;
          <Link to="/categories">Categories</Link>&nbsp;
          <Link to="/add">Add</Link>
        </nav>
        <div className="app-content">{this.props.children}</div>
      </div>
    );
  }
}