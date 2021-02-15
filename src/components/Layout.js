import React from 'react';
import {Link} from 'react-router-dom';

import {locale} from './locale';
import ReceiptService from './ReceiptService';
import DataStore from './DataStore';
import ui from './ui';

function confirmExit() {
  return "You have attempted to leave this page. Are you sure?";
}

export default class Layout extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currency: locale.getCurrency(),
      locale: locale.getLocale(),
      currentGroupId: ui.getCurrentGroup(),
      products: [],
      manufacturers: [],
      categories: [],
      parties: [],
      groups: [],
      isReady: false
    }

    this.onCurrencyChange = this.onCurrencyChange.bind(this);
    this.onLocaleChange = this.onLocaleChange.bind(this);
    this.onEnergyUnitChange = this.onEnergyUnitChange.bind(this);
    this.onUpload = this.onUpload.bind(this);
  }
  componentDidMount() {
    Promise.all([
      DataStore.getProducts(),
      DataStore.getManufacturers(),
      DataStore.getCategories(),
      DataStore.getParties(),
      DataStore.getGroups()
    ])
    .then(([products, manufacturers, categories, parties, groups]) => {
      this.setState({
        isReady: true,
        products,
        manufacturers,
        categories,
        parties,
        groups
      });
    });
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
  onGroupChange(currentGroupId) {
    ui.setCurrentGroup(currentGroupId);
    this.setState({currentGroupId});
  }
  onEnergyUnitChange(event) {
    locale.setAttributeUnit('energy,calculated', event.target.value);
  }
  async onUpload(event) {
    //event.preventDefault();

    //window.onbeforeunload = confirmExit;

    let files;
    if (event.dataTransfer) {
      files = event.dataTransfer.files;
    } else if (event.target) {
      files = event.target.files;
    }

    if (!files[0]) return;

    for (let file of Array.from(files)) {
      try {
        const transactions = await (new ReceiptService).upload(file);
        console.log(transactions);
      } catch (error) {
        console.error(error);
      }
    }
    window.onbeforeunload = null;
  }
  render() {
    const {
      isReady,
      groups,
      currentGroupId
    } = this.state;
    return (
      <div className="app-container">
        {!isReady ? 'Loading...' :
        <>
          <header>
            <div className="header-container">
              <div className="logo" style={{float:'left'}}>
                <Link to="/"></Link>
              </div>
              <div style={{float:'right'}}>
                <select
                  id="group"
                  placeholder="Group"
                  value={currentGroupId}
                  onChange={event => this.onGroupChange(event.target.value)}>
                  <option value="-1">All groups</option>
                  <option value="">No group</option>
                  {groups.map(group => (
                    <option
                      key={`group-${group.id}`}
                      value={group.id}>
                        {group.name}
                    </option>
                  ))}
                </select>&nbsp;
                <select 
                  id="currency"
                  placeholder="Currency"
                  value={this.state.currency}
                  onChange={this.onCurrencyChange.bind(this)}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                  <option value="ARS">ARS</option>
                </select>&nbsp;
                <select
                  id="locale"
                  placeholder="Locale"
                  value={this.state.locale}
                  onChange={this.onLocaleChange.bind(this)}>
                  <option value="fi-FI">fi-FI</option>
                  <option value="sv-SV">sv-SV</option>
                  <option value="en-US">en-US</option>
                  <option value="es-AR">es-AR</option>
                </select>&nbsp;
                <select
                  id="energy"
                  placeholder="Energy"
                  value={locale.getAttributeUnit('energy,calculated')}
                  onChange={this.onEnergyUnitChange.bind(this)}>
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
                <Link to="/" className="button"><i className="fas fa-chart-area" title="Overview"></i></Link>
                <Link to="/categories" className="button"><i className="fas fa-search" title="Categories"></i></Link>
                <div className="button file-upload-wrapper">
                  <i className="fas fa-plus" title="Upload"></i>
                  <input type="file" name="upload-file" id="upload-file" multiple draggable onChange={this.onUpload}/>
                </div>
                <Link to="/transactions" className="button"><i className="fas fa-shopping-cart" title="Transactions"></i></Link>
                <Link to="/items" className="button"><i className="fas fa-box-open" title="Items"></i></Link>
              </nav>
            </div>
          </footer>
        </>}
      </div>
    );
  }
}