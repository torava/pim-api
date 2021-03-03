import React from 'react';

import {locale} from './locale';
import ReceiptService from './ReceiptService';
import DataStore from './DataStore';
import ui from './ui';
import { downloadString, exportTransactions } from '../utils/export';
import { setupWorker } from '../utils/tesseractWorker';

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
      attributes: [],
      isReady: false,
      isWorkerReady: false,
      pipeline: {
        crop: true
      }
    };

    this.onCurrencyChange = this.onCurrencyChange.bind(this);
    this.onLocaleChange = this.onLocaleChange.bind(this);
    this.onEnergyUnitChange = this.onEnergyUnitChange.bind(this);
    this.onUpload = this.onUpload.bind(this);
  }
  async componentDidMount() {
    const worker = await setupWorker((m) => {
        if (m.status === 'initialized api') {
          this.setState({isWorkerReady: true});
        }
    });

    Promise.all([
      DataStore.getProducts(),
      DataStore.getManufacturers(),
      DataStore.getCategories(),
      DataStore.getParties(),
      DataStore.getAttributes()
    ])
    .then(([products, manufacturers, categories, parties, attributes]) => {
      this.setState({
        isReady: true,
        products,
        manufacturers,
        categories,
        parties,
        attributes,
        worker
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
    const {
      worker,
      categories,
      attributes,
      pipeline
    } = this.state;

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
        const receiptService = new ReceiptService(worker, pipeline);
        const result = await receiptService.upload(file);
        transactions.push(result);
        console.log(result);
      } catch (error) {
        console.error(error);
      }
    }
    console.log(transactions);
    const csv = exportTransactions(transactions, categories, attributes);
    console.log(csv);
    downloadString(csv, 'text/csv', 'items.csv');
    window.onbeforeunload = null;
  }
  render() {
    const {
      isReady,
      isWorkerReady
    } = this.state;
    return (
      <div className="app-container">
        {(!isReady || !isWorkerReady) ? 'Loading...' :
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
            <label>
              <input
                type="checkbox"
                checked={this.state.pipeline.crop}
                onChange={event => this.setState({pipeline: {crop: event.target.checked ? true : false}})}/>
              Crop
            </label>
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