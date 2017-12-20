'use strict';

import React from 'react';
import {Link} from 'react-router-dom';

export default class Layout extends React.Component {
  constructor(props) {
    super(props);

    this.onCurrencyChange = this.onCurrencyChange.bind(this);
    this.onLocaleChange = this.onLocaleChange.bind(this);
  }
  onCurrencyChange(event) {
    console.log(event.target.value);
    window.localStorage.setItem('currency', event.target.value);
  }
  onLocaleChange(event) {
    window.localStorage.setItem('locale', event.target.value);
  }
  render() {
    return (
      <div className="app-container">
       <header>
          <nav style={{float:'left'}}>
            <Link to="/">Receipts</Link>&nbsp;
            <Link to="/items">Items</Link>&nbsp;
            <Link to="/categories">Categories</Link>&nbsp;
            <Link to="/add">Add</Link>
          </nav>
          <div style={{float:'right'}}>
            <select id="currency" onChange={this.onCurrencyChange.bind(this)}>
              <option>EUR</option>
              <option>ARS</option>
            </select>
            <select id="locale" onChange={this.onLocaleChange.bind(this)}>
              <option>fi-FI</option>
              <option>en-US</option>
              <option>es-AR</option>
            </select>
          </div>
          <div style={{clear:'both'}}/>
        </header>
        <div className="app-content">{this.props.children}</div>
      </div>
    );
  }
}