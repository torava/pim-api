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
          <div className="header-container">
            <div style={{float:'right'}}>
              <select id="currency" onChange={this.onCurrencyChange.bind(this)}>
                <option>EUR</option>
                <option>CAD</option>
                <option>ARS</option>
              </select>
              <select id="locale" onChange={this.onLocaleChange.bind(this)}>
                <option>fi-FI</option>
                <option>en-US</option>
                <option>es-AR</option>
              </select>
              <Link to="/" className="button"><i className="fas fa-user"></i></Link>
            </div>
            <div style={{clear:'both'}}/>
          </div>
        </header>
        <div className="app-content">{this.props.children}</div>
        <footer>
          <div className="footer-container">
            <nav>
              <Link to="/" className="button"><i className="fas fa-chart-area"></i></Link>&nbsp;
              <Link to="/categories" className="button"><i className="fas fa-search"></i></Link>&nbsp;
              <Link to="/add" className="button"><i className="fas fa-plus"></i></Link>
              <Link to="/transactions" className="button"><i className="fas fa-shopping-cart"></i></Link>&nbsp;
              <Link to="/items" className="button"><i className="fas fa-box-open"></i></Link>&nbsp;
            </nav>
          </div>
        </footer>
      </div>
    );
  }
}