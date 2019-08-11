'use strict';

import React from 'react';
import {Link} from 'react-router-dom';
import {locale} from './locale';
import ReceiptService from './ReceiptService';
import DataStore from './DataStore';

function confirmExit() {
  return "You have attempted to leave this page. Are you sure?";
}

export default class Layout extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currency: locale.getCurrency(),
      locale: locale.getLocale()
    }

    this.onCurrencyChange = this.onCurrencyChange.bind(this);
    this.onLocaleChange = this.onLocaleChange.bind(this);
    this.onEnergyUnitChange = this.onEnergyUnitChange.bind(this);
    this.onUpload = this.onUpload.bind(this);

    this.receiptService = new ReceiptService();
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
  onEnergyUnitChange(event) {
    locale.setAttributeUnit('energy,calculated', event.target.value);
  }
  onUpload(event) {
    event.preventDefault();

    //window.onbeforeunload = confirmExit;

    let files;
    if (event.dataTransfer) {
      files = event.dataTransfer.files;
    } else if (event.target) {
      files = event.target.files;
    }

    if (!files[0]) return;

    this.receiptService.upload(files)
    .then((transactions) => {
      console.log(transactions);
      window.onbeforeunload = null;
    })
  }
  render() {
    return (
      <div className="app-container">
       <header>
          <div className="header-container">
            <div className="logo" style={{float:'left'}}>
              <Link to="/"></Link>
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
                <option value="sv-SV">sv-SV</option>
                <option value="en-US">en-US</option>
                <option value="es-AR">es-AR</option>
              </select>
              <select id="energy"
                      value={locale.getAttributeUnit('energy,calculated')}
                      onChange={this.onEnergyUnitChange.bind(this)}
              >
                <option value="kJ">kJ</option>
                <option value="kcal">kcal</option>
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
              <div className="button file-upload-wrapper">
                <i className="fas fa-plus"></i>
                <input type="file" name="upload-file" id="upload-file" multiple draggable onChange={this.onUpload}/>
              </div>
              <Link to="/transactions" className="button"><i className="fas fa-shopping-cart"></i></Link>&nbsp;
              <Link to="/items" className="button"><i className="fas fa-box-open"></i></Link>&nbsp;
            </nav>
          </div>
        </footer>
      </div>
    );
  }
}