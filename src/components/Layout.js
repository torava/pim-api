import React from 'react';
import { createWorker } from 'tesseract.js';

import {locale} from './locale';
import ReceiptService from './ReceiptService';
import DataStore from './DataStore';
import ui from './ui';
import { downloadString, exportTransactions } from '../utils/export';

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
      isReady: false
    };

    const worker = createWorker({
      logger: m => console.log(m)
    });
    
    (async () => {
      await worker.load();
      await worker.loadLanguage('fin+eng');
      await worker.initialize('fin+eng');
      await worker.setParameters({
        psm: 4,
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890-,.:/% ',
        textord_max_noise_size: 15
      });
    })();

    this.worker = worker;

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
      DataStore.getParties()
    ])
    .then(([products, manufacturers, categories, parties]) => {
      this.setState({
        isReady: true,
        products,
        manufacturers,
        categories,
        parties
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

    const transactions = [];
    for (let file of Array.from(files)) {
      try {
        const receiptService = new ReceiptService(this.worker);
        const result = await receiptService.upload(file);
        transactions.push(result);
        console.log(result);
      } catch (error) {
        console.error(error);
      }
    }
    console.log(transactions);
    const csv = exportTransactions(transactions, this.state.categories);
    console.log(csv);
    downloadString(csv, 'text/csv', 'items.csv');
    window.onbeforeunload = null;
  }
  render() {
    const {
      isReady
    } = this.state;
    return (
      <div className="app-container">
        {!isReady ? 'Loading...' :
        <>
          <p>
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
            </select>&nbsp;
            <select
              id="energy"
              placeholder="Energy"
              value={locale.getAttributeUnit('energy,calculated')}
              onChange={this.onEnergyUnitChange.bind(this)}>
              <option value="kJ">kJ</option>
              <option value="kcal">kcal</option>
            </select>
          </p>
          <label>
            Upload:<br/>
            <input type="file" name="upload-file" id="upload-file" multiple draggable onChange={this.onUpload}/>
          </label>
        </>}
      </div>
    );
  }
}