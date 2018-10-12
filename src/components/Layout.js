'use strict';

import React from 'react';
import {Link} from 'react-router-dom';
import {locale} from './locale';

export default class Layout extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currency: locale.getCurrency(),
      locale: locale.getLocale()
    }

    this.onCurrencyChange = this.onCurrencyChange.bind(this);
    this.onLocaleChange = this.onLocaleChange.bind(this);
  }
  onCurrencyChange(event) {
    locale.setCurrency(event.target.value);
    this.setState({
      currency: locale.getCurrency()
    });
  }
  onLocaleChange(event) {
    locale.setLocale(event.target.value);
    this.setState({
      locale: locale.getLocale()
    });
  }
  render() {
    return (
      <div className="app-container">
       <header>
          <div className="header-container">
            <div className="logo" style={{float:'left'}}>
              <Link to="/">Teimo</Link>
            </div>
            <div style={{float:'right'}}>
              <select id="currency"
                      value={this.state.currency}
                      onChange={this.onCurrencyChange.bind(this)
              }>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="ARS">ARS</option>
              </select>
              <select id="locale"
                      value={this.state.locale}
                      onChange={this.onLocaleChange.bind(this)}
              >
                <option value="fi-FI">fi-FI</option>
                <option value="en-US">en-US</option>
                <option value="es-AR">es-AR</option>
              </select>
              <Link to="/" className="button"><i className="fas fa-user"></i></Link>
            </div>
            <div style={{clear:'both'}}/>
          </div>
        </header>
        <div className="app-content">{
          this.props.children
        }</div>
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