import React from 'react';

import {locale} from './locale';
import ReceiptService from './ReceiptService';
import DataStore from './DataStore';
import ui from './ui';
import { downloadString, exportTransactions, getCsvFromObject, getXlsxFromObject } from '../utils/export';
import { setupWorker } from '../utils/tesseractWorker';
import CategoryList from './CategoryListPage';
import Attributes from './shared/Attributes';
import TransactionList from './TransactionList';

import './Layout.scss';
import { Accordion } from './shared/Accordion';
import { Settings } from './Settings';

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
      transactions: JSON.parse(window.localStorage.getItem('transactions')) || [],
      isReady: false,
      isWorkerReady: false,
      pipeline: {
        crop: ui.getCrop()
      },
      receiptsProcessed: undefined,
      receiptCount: undefined,
      receiptProcessingTime: undefined,
      attributeAggregates: [],
      attributeUnits: locale.getAttributeUnits()
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
      console.log('done', categories, attributes);
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
    locale.setAttributeUnit('Energy,calculated', event.target.value);
    this.setState({
      attributeUnits: locale.getAttributeUnits()
    });
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

    const updatedTransactions = [...this.state.transactions, ...transactions];

    window.localStorage.setItem('transactions', JSON.stringify(updatedTransactions));

    this.setState({
      receiptProcessingTime: t1-t0,
      transactions: updatedTransactions
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
      attributeAggregates,
      attributeUnits,
      transactions,
      categories,
      pipeline,
      format,
      locale,
      currency
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
      <div className="layout__container">
        {(!isReady || !isWorkerReady) ? 'Loading...' :
        <>
          <div>
            <h1>Welcome</h1>
          </div>
          <div className="transactions__container">
            <div className="transactions__content">
              <Accordion
                type="h2"
                title="Categories">
                <CategoryList
                  selectedAttributes={attributeAggregates}
                  attributeUnits={attributeUnits}/>
              </Accordion>
              <Accordion
                type="h2"
                title="Attributes"
                collapsed>
                <Attributes
                  attributes={attributes}
                  attributeAggregates={attributeAggregates}
                  setAttributeAggregates={(attributeAggregates) => this.setState({attributeAggregates})}/>
              </Accordion>
              <Accordion
                type="h2"
                title="Transactions"
                collapsed>
                <TransactionList
                  transactions={transactions}
                  categories={categories}
                  attributes={attributes}
                  attributeAggregates={attributeAggregates}
                  format={format}/>
              </Accordion>
              <Accordion
                type="h2"
                title="Upload"
                collapsed>
                <label>
                  Upload:<br/>
                  <input type="file" name="upload-file" id="upload-file" multiple draggable onChange={this.onUpload}/>
                </label>
                {typeof receiptCount !== 'undefined' &&
                <p>{message}</p>}
              </Accordion>
              <Accordion
                type="h2"
                title="Settings"
                collapsed>
                <Settings
                  currency={currency}
                  onCurrencyChange={this.onCurrencyChange}
                  locale={locale}
                  onLocaleChange={this.onLocaleChange}
                  attributeUnits={attributeUnits}
                  onEnergyUnitChange={this.onEnergyUnitChange}
                  format={format}
                  onFormatChange={this.onFormatChange}
                  pipeline={pipeline}
                  onCropChange={this.onCropChange}/>
              </Accordion>
            </div>
          </div>
        </>}
        <p>v{process.env.VERSION}</p>
      </div>
    );
  }
}