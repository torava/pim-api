import React from 'react';

import {locale} from './locale';
import ReceiptService from './ReceiptService';
import DataStore from './DataStore';
import ui from './ui';
import { downloadString, exportTransactions, getCsvFromObject, getXlsxFromObject } from '../utils/export';
import { setupWorker } from '../utils/tesseractWorker';
import CategoryList from './CategoryListPage';
import Attributes from './shared/Attributes';

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
        crop: ui.getCrop()
      },
      receiptsProcessed: undefined,
      receiptCount: undefined,
      receiptProcessingTime: undefined,
      attributeAggregates: []
    };

    this.onCurrencyChange = this.onCurrencyChange.bind(this);
    this.onLocaleChange = this.onLocaleChange.bind(this);
    this.onEnergyUnitChange = this.onEnergyUnitChange.bind(this);
    this.onFormatChange = this.onFormatChange.bind(this);
    this.onCropChange = this.onCropChange.bind(this);
    this.onUpload = this.onUpload.bind(this);
  }
  async componentDidMount() {
    const worker = await setupWorker((m) => {
      console.log(m);
      if (m.status === 'initialized api') {
        this.setState({isWorkerReady: true});
      }
    });

    Promise.all([
      DataStore.getCategories(),
      DataStore.getAttributes(),
      DataStore.getProducts(),
      DataStore.getManufacturers(),
      DataStore.getParties(),
      DataStore.getItems()
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
  onCropChange(event) {
    const crop = event.target.checked ? true : false;
    ui.setCrop(crop);
    this.setState({pipeline: {crop}});
  }
  async onUpload(event) {
    const t0 = performance.now();

    const {
      worker,
      categories,
      attributes,
      attributeAggregates,
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
      receiptCount: files.length,
      receiptProcessingTime: undefined
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
    const rows = exportTransactions(transactions, categories, attributes, attributeAggregates);
    if (format === 'text/csv') {
      const csv = await getCsvFromObject(rows);
      downloadString(csv, format, 'items.csv');
    } else if (format === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const xlsx = await getXlsxFromObject(rows);
      downloadString(xlsx, format, 'items.xlsx');
    }
    //window.onbeforeunload = null;

    const t1 = performance.now();

    this.setState({
      receiptProcessingTime: t1-t0
    });
  }
  render() {
    const {
      isReady,
      isWorkerReady,
      receiptCount,
      receiptsProcessed,
      receiptProcessingTime,
      attributes,
      attributeAggregates
    } = this.state;

    let message;
    if (receiptsProcessed < receiptCount) {
      message = `Processing... ${receiptsProcessed}/${receiptCount} receipts processed`;
    } else {
      message = `${receiptsProcessed}/${receiptCount} receipts processed successfully`;
      if (typeof receiptProcessingTime !== 'undefined') {
        message+= ` in ${Math.round(receiptProcessingTime/1000)} s`;
      }
    }

    return (
      <div className="app-container">
        {(!isReady || !isWorkerReady) ? 'Loading...' :
        <>
          <h1>Bookkeeper</h1>
          <h2>Upload</h2>
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
                onChange={this.onCropChange.bind(this)}/>
              Crop
            </label>
          </p>
          <label>
            Upload:<br/>
            <input type="file" name="upload-file" id="upload-file" multiple draggable onChange={this.onUpload}/>
          </label>
          {typeof this.state.receiptCount !== 'undefined' &&
          <p>{message}</p>}
          <h3>Attributes</h3>
          <Attributes
            attributes={attributes}
            attributeAggregates={attributeAggregates}
            setAttributeAggregates={(attributeAggregates) => this.setState({attributeAggregates})}/>
          <h2>Categories</h2>
          <CategoryList/>
        </>}
      </div>
    );
  }
}