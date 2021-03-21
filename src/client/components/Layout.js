import React from 'react';

import {locale} from './locale';
import ReceiptService from './ReceiptService';
import DataStore from './DataStore';
import ui from './ui';
import { downloadString, exportTransactions, getCsvFromObject, getXlsxFromObject } from '../utils/export';
import { setupWorker } from '../utils/tesseractWorker';

export default class Layout extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currency: locale.getCurrency(),
      locale: locale.getLocale(),
      format: ui.getFormat(),
      currentGroupId: ui.getCurrentGroup(),
      categories: [],
      parties: [],
      attributes: [],
      isReady: false,
      isWorkerReady: false,
      pipeline: {
        crop: true
      },
      receiptsProcessed: undefined,
      receiptCount: undefined
    };

    this.onCurrencyChange = this.onCurrencyChange.bind(this);
    this.onLocaleChange = this.onLocaleChange.bind(this);
    this.onEnergyUnitChange = this.onEnergyUnitChange.bind(this);
    this.onFormatChange = this.onFormatChange.bind(this);
    this.onUpload = this.onUpload.bind(this);
  }
  async componentDidMount() {
    const worker = await setupWorker((m) => {
        if (m.status === 'initialized api') {
          this.setState({isWorkerReady: true});
        }
    });

    Promise.all([
      DataStore.getCategories(),
      DataStore.getAttributes(),
      DataStore.getProducts(),
      DataStore.getManufacturers(),
      DataStore.getParties()
    ])
    .then(([categories, attributes]) => {
      this.setState({
        isReady: true,
        categories,
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
  onFormatChange(event) {
    ui.setFormat(event.target.value);
    this.setState({format: event.target.value});
  }
  async onUpload(event) {
    const t0 = performance.now();

    const {
      worker,
      categories,
      attributes,
      pipeline,
      format
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

    this.setState({
      receiptsProcessed: 0,
      receiptCount: files.length
    });

    const transactions = [];
    for (let file of Array.from(files)) {
      try {
        const receiptService = new ReceiptService(worker, pipeline);
        const result = await receiptService.upload(file);
        transactions.push(result);
        this.setState({
          receiptsProcessed: transactions.length
        });
        console.log(result);
      } catch (error) {
        console.error(error);
      }
    }
    console.log(transactions);
    const rows = exportTransactions(transactions, categories, attributes);
    if (format === 'text/csv') {
      const csv = await getCsvFromObject(rows);
      downloadString(csv, format, 'items.csv');
    } else if (format === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const xlsx = await getXlsxFromObject(rows);
      downloadString(xlsx, format, 'items.xlsx');
    }
    //window.onbeforeunload = null;

    const t1 = performance.now();

    console.log(`Processed ${files.length} files in ${t1-t0} ms`);
  }
  render() {
    const {
      isReady,
      isWorkerReady,
      receiptCount,
      receiptsProcessed
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
              <option value="SEK">SEK</option>
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
          <p>
            <select
              id="format"
              placeholder="Format"
              value={this.state.format}
              onChange={this.onFormatChange.bind(this)}>
              <option value="text/csv">CSV</option>
              <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">XLSX</option>
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
          {typeof this.state.receiptCount !== 'undefined' &&
          <p>
            {`${
                receiptsProcessed < receiptCount ? 'Processing...' : ''
              } ${receiptsProcessed}/${receiptCount} receipts processed`}
          </p>}
        </>}
      </div>
    );
  }
}