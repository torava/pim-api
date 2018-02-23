'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import axios from 'axios';
import Cropper from 'react-cropper';
import moment from 'moment';
import Autosuggest from 'react-autosuggest';

class ReceiptItem extends React.Component {
  render() {
    return (<div>
            <input type="search" value={this.props.item.item_number || ''}
                                 onChange={this.props.onItemNumberChange.bind(this, this.props.i)}
                                 style={{width:'10em'}}
                                 placeholder="#"/>
            <input type="number" value={this.props.item.quantity || ''}
                                 onChange={this.props.onItemQuantityChange.bind(this, this.props.i)}
                                 style={{width:'5em'}}
                                 placeholder="Quantity"/>x
            <input type="number" value={this.props.item.measure || ''}
                                 onChange={this.props.onItemMeasureChange.bind(this, this.props.i)}
                                 style={{width:'5em'}}
                                 placeholder="Measure"/>
            <select onChange={this.props.onItemUnitChange.bind(this, this.props.i)}>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
            </select>
            <input type="search" list="products"
                                 value={this.props.item.product && this.props.item.product.name || ''}
                                 onChange={this.props.onItemNameChange.bind(this, this.props.i)}
                                 style={{width:'18em'}}
                                 placeholder="Name"/>
            <Autosuggest
              suggestions={this.props.categorySuggestions}
              onSuggestionsFetchRequested={this.props.onSuggestionsFetchRequested}
              onSuggestionsClearRequested={this.props.onSuggestionsClearRequested}
              getSuggestionValue={this.props.getSuggestionValue}
              renderSuggestion={this.props.renderSuggestion}
              inputProps={this.props.inputProps}
            />
            <input type="number" defaultValue={this.props.item.price ? parseFloat(this.props.item.price).toFixed(2) : ''}
                                 onChange={this.props.onItemPriceChange.bind(this, this.props.i)}
                                 step={.01} style={{width:'5em'}}
                                 placeholder="Price"/>
            <button onClick={this.props.onDeleteItem.bind(this, this.props.i)}>-</button>
            <button onClick={this.props.onAddItem.bind(this, this.props.i)}>+</button>
            <span onClick={this.props.toggle.bind(this, 'details-'+this.props.i)}>&#9662;</span>
            <div id={'details-'+this.props.i} style={{display:'none'}}>
              Manufacturer <input type="search" list="manufacturers"
                                  value={this.props.item.product && this.props.item.product.manufacturer && this.props.item.product.manufacturer.name || ''}
                                  onChange={this.props.onItemManufacturerChange.bind(this, this.props.i)}/><br/>
              <div onClick={this.props.toggle.bind(this, 'measurements-'+this.props.i)}>Measurements</div>
              <div id={'measurements-'+this.props.i} style={{display:'none'}}>
                L<input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'length')}/>x
                W<input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'width')}/>x
                H<input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'height')}/>
              </div>
              <div onClick={this.props.toggle.bind(this, 'nutrition-'+this.props.i)}>Nutritional Attributes</div>
              <div id={'nutrition-'+this.props.i} style={{display:'none'}}>
                Energy <input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'energy')}/> kcal<br/>
                Carbohydrate <input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'carbohydrate')}/> g<br/>
                Protein <input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'protein')}/> g<br/>
                Fat <input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'fat')}/> g<br/>
                Fiber <input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'fiber')}/> g<br/>
                Best before <input type="datetime-local" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'fiber')}/><br/>
                Last date <input type="datetime-local" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'fiber')}/>
              </div>
              <div onClick={this.props.toggle.bind(this, 'environment-'+this.props.i)}>Environmental Attributes</div>
              <div id={'environment-'+this.props.i} style={{display:'none'}}>
                CO2 <input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'co2')}/>
                Methane <input type="number" onChange={this.props.onItemAttributeChange.bind(this, this.props.i, 'methane')}/>
              </div>
            </div>
          </div>);
  }
}

export default class addReceiptPage extends React.Component {
  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.saveReceipt = this.saveReceipt.bind(this);
    this.deleteTransaction = this.deleteTransaction.bind(this);
    this.onDateChange = this.onDateChange.bind(this);
    this.onFieldChange = this.onFieldChange.bind(this);
    this.onItemQuantityChange = this.onItemQuantityChange.bind(this);
    this.onItemMeasureChange = this.onItemMeasureChange.bind(this);
    this.onItemManufacturerChange = this.onItemManufacturerChange.bind(this);
    this.onItemUnitChange = this.onItemUnitChange.bind(this);
    this.onItemPriceChange = this.onItemPriceChange.bind(this);
    this.onItemAttributeChange = this.onItemAttributeChange.bind(this);
    this.onItemNumberChange = this.onItemNumberChange.bind(this);
    this.onItemNameChange = this.onItemNameChange.bind(this);
    this.onItemCategoryChange = this.onItemCategoryChange.bind(this);
    this.onDeleteItem = this.onDeleteItem.bind(this);
    this.onLocaleChange = this.onLocaleChange.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
    this.onCategorySuggestionsFetchRequested = this.onCategorySuggestionsFetchRequested.bind(this);
    this.onCategorySuggestionsClearRequested = this.onCategorySuggestionsClearRequested.bind(this);

    this.state = {
      transactions: this.props.transactions,
      manufacturers: this.props.manufacturers,
      categories: this.props.categories,
      products: this.props.products,
      version: this.props.version,
      categorySuggestions: []
    }
  }
  componentWillReceiveProps(props) {
    this.setState({
      transactions: props.transactions,
      manufacturers: props.manufacturers,
      categories: props.categories,
      products: props.products,
      version: props.version
    });  
  }
  onLocaleChange(event) {
    let transactions = this.state.transactions;
    transactions[0].receipts[0].locale = event.target.value;
    this.setState({transactions});
  }
  toggle(id, event) {
    document.getElementById(id).style.display = document.getElementById(id).style.display == 'none' ? 'block' : 'none';
  }
  saveReceipt(event) {
    axios.post('/api/transaction/', this.state.transactions)
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  deleteTransaction(event) {
    axios.delete('/api/transaction/'+this.state.transactions[0].id)
    .then(function(response) {
      window.location = '/';
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  onFieldChange(field1, field2, event) {
    let transactions = this.state.transactions;
    if (field2) {
      if (event.target.value) {
        transactions[0][field1][field2] = event.target.value;
      }
      else {
        delete transactions[0][field1][field2];
      }
    }
    else {
      if (event.target.value) {
        transactions[0][field1] = event.target.value;
      }
      else {
        delete transactions[0][field1];
      }
    }
    this.setState({
      transactions
    })  
  }
  onDateChange(event) {
    if (!isNaN(Date.parse(event.target.value))) {
      let transactions = this.state.transactions;
      transactions[0].date = event.target.value;
      this.setState({
        transactions
      });
    }
  }
  onItemNumberChange(key, event) {
    let transactions = this.state.transactions;
    transactions[0].items[key].item_number = event.target.value;

    this.setState({
      transactions: transactions
    });
  }
  onItemNameChange(key, event) {
    let transactions = this.state.transactions;
    transactions[0].items[key].product = {name: event.target.value};

    this.setState({
      transactions: transactions
    });
  }
  onItemQuantityChange(key, event) {
    let transactions = this.state.transactions;

    if (event.target.value)
      transactions[0].items[key].quantity = parseFloat(event.target.value);
    else
      delete transactions[0].items[key].quantity;

    this.setState({
      transactions: transactions
    });
  }
  onItemMeasureChange(key, event) {
    let transactions = this.state.transactions;
    
    console.log(event.target.value);

    if (event.target.value)
      transactions[0].items[key].measure = parseFloat(event.target.value);
    else
      delete transactions[0].items[key].measure;

    this.setState({
      transactions: transactions
    });
  }
  onItemUnitChange(key, event) {
    let transactions = this.state.transactions;
    transactions[0].items[key].unit = event.target.value;

    this.setState({
      transactions: transactions
    });
  }
  onItemAttributeChange(key, attribute, event) {
    let transactions = this.state.transactions;

    if (!transactions[0].items[key].product.attributes) transactions[0].items[key].product.attributes = [];

    transactions[0].items[key].product.attributes.push({name: attribute, value: event.target.value});

    this.setState({
      transactions: transactions
    });
  }
  onItemManufacturerChange(key, event) {
    let transactions = this.state.transactions;
    transactions[0].items[key].product.manufacturer = {name: event.target.value};

    /* todo add
    let categories = this.state.categories;
    categories.push({name:element.name}); */

    this.setState({
      transactions: transactions
    });
  }
  onItemCategoryChange(key, event, val) {
    let transactions = this.state.transactions,
        categories = this.state.categories,
        name = event.target.value,
        id;

    for (let i in categories) {
      if (categories[i].name['fi-FI'] == name) {
        id = categories[i].id;
        break;
      }
    }

    transactions[0].items[key].product.category = {
      id,
      name: {
        'fi-FI': name
      }
    };

    /* todo add
    let categories = this.state.categories;
    categories.push({name:element.name}); */

    this.setState({
      transactions: transactions
    });
  }
  onItemPriceChange(key, event) {
    let transactions = this.state.transactions;
    transactions[0].items[key].price = parseFloat(event.target.value);

    let total_price = 0;

    for (let i in transactions[0].items) {
      total_price+= transactions[0].items[i].price;
    }
    transactions[0].total_price = total_price;
    this.setState({
      transactions: transactions
    });
  }
  onDeleteItem(key, event) {
    //e.target.parentNode.outerHTML = '';
    let transactions = this.state.transactions;
    transactions[0].items.splice(key, 1);
    this.setState({
      transactions: transactions
    });
  }
  onAddItem(key, event) {
    let transactions = this.state.transactions;
    transactions[0].items.splice(key, 0, {});

    this.setState({
      version: Date.now(), // Update version
      transactions: transactions
    });
    //ReactDOM.findDOMNode(this).getElementsByClassName('receipt-items')[0].append(<ReceiptItem onDeleteItem={that.onDeleteItem} onAddItem={that.onAddItem} onItemPriceChange={that.onItemPriceChange}/>);

  }
  // Autosuggest will call this function every time you need to update suggestions.
  // You already implemented this logic above, so just use it.
  onCategorySuggestionsFetchRequested({ value }) {
    this.setState({
      categorySuggestions: this.getCategorySuggestions(value)
    });
  };

  // Autosuggest will call this function every time you need to clear suggestions.
  onCategorySuggestionsClearRequested() {
    this.setState({
      categorySuggestions: []
    });
  };

  // Teach Autosuggest how to calculate suggestions for any given input value.
  getCategorySuggestions(value) {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0 ? [] : this.state.categories.filter(category => {
      let name = category.name['fi-FI'];
      return name.toLowerCase().slice(0, inputLength) === inputValue;
    });
  };

  render() {
    let that = this,
    receiptIsRead = this.state.transactions.length && this.state.transactions[0].receipts[0].text,
    receiptContent = "";


    // When suggestion is clicked, Autosuggest needs to populate the input
    // based on the clicked suggestion. Teach Autosuggest how to calculate the
    // input value for every given suggestion.
    const getSuggestionValue = suggestion => suggestion.name['fi-FI'];

    // Use your imagination to render suggestions.
    const renderSuggestion = suggestion => (
      <div>
        {suggestion.name['fi-FI']}
      </div>
    );

    if (receiptIsRead) {
      return (
        <div className="receipt-content">
          <datalist id="manufacturers">
            {this.state.manufacturers.map(function(item, i) {
              return <option value={item.name}/>
            })}
          </datalist>
          <datalist id="products">
            {this.state.products.map(function(item, i) {
              return <option value={item.name}/>
            })}
          </datalist>
          <div className="receipt-picture" style={{float:'left'}}>
            <img src={"/api/receipt/picture/"+this.state.transactions[0].receipts[0].file+"?"+this.state.version} style={{width:300}}/>
          </div>
          <div style={{float:'left'}}>
            <div className="receipt-editor" style={{float:'left'}}>
              <div>Store Name: <input key={"store-name-"+this.state.version} type="search" value={this.state.transactions[0].party.name || ''} onChange={this.onFieldChange.bind(this, 'party', 'name')}/></div>
              <div>VAT: <input key={"vat-"+this.state.version} type="search" value={this.state.transactions[0].party.vat || ''} onChange={this.onFieldChange.bind(this, 'party', 'vat')}/></div>
              <div>Street:
                <input key={"street-name-"+this.state.version} type="search" value={this.state.transactions[0].party.street_name || ''} onChange={this.onFieldChange.bind(this, 'party', 'street_name')}/>
                <input key={"street-number-"+this.state.version} type="search" value={this.state.transactions[0].party.street_number || ''} onChange={this.onFieldChange.bind(this, 'party', 'street_number')}/>
              </div>
              <div>Postal Code: <input key={"postal-code-"+this.state.version} type="search" value={this.state.transactions[0].party.postal_code || ''} onChange={this.onFieldChange.bind(this, 'party', 'postal_code')}/></div>
              <div>City: <input key={"city-"+this.state.version} type="search" value={this.state.transactions[0].party.city || ''} onChange={this.onFieldChange.bind(this, 'party', 'city')}/></div>
              <div>Phone Number: <input key={"phone-number-"+this.state.version} type="phone" value={this.state.transactions[0].party.phone_number || ''} onChange={this.onFieldChange.bind(this, 'party', 'phone_number')}/></div>
              <div>Date: <input key={"date-"+this.state.version} type="datetime-local" defaultValue={this.state.transactions[0].date && moment(this.state.transactions[0].date).format('YYYY-MM-DDTHH:mm:ss') || ''} onChange={this.onDateChange.bind(this)}/></div>
              <div>
                Locale:
                <select id="locale" onChange={this.onLocaleChange.bind(this)}>
                {['fi-FI', 'en-US', 'es-AR'].map(function(item, i) {
                  return <option {...that.state.transactions[0].receipts[0].locale === item && ' selected'}>{item}</option>
                })}
                </select>
              </div>
              <div className="receipt-items">
                {this.state.transactions[0].items.map(function(item, i){
                  let inputProps = {
                    placeholder: 'Category',
                    value: item.product && item.product.category && item.product.category.name['fi-FI'] || '',
                    onChange: that.onItemCategoryChange.bind(this, i)
                  };

                  return <ReceiptItem item={item}
                                      key={'item-'+i+'-'+that.state.version}
                                      i={i}
                                      state={that.state}
                                      onDeleteItem={that.onDeleteItem}
                                      onAddItem={that.onAddItem}
                                      onItemPriceChange={that.onItemPriceChange}
                                      onItemNameChange={that.onItemNameChange}
                                      onItemNumberChange={that.onItemNumberChange}
                                      onItemCategoryChange={that.onItemCategoryChange}
                                      onItemAttributeChange={that.onItemAttributeChange}
                                      onItemManufacturerChange={that.onItemManufacturerChange}
                                      onItemMeasureChange={that.onItemMeasureChange}
                                      onItemQuantityChange={that.onItemQuantityChange}
                                      onItemUnitChange={that.onItemUnitChange}
                                      toggle={that.toggle}
                                      categorySuggestions={that.state.categorySuggestions}
                                      onSuggestionsFetchRequested={that.onCategorySuggestionsFetchRequested}
                                      onSuggestionsClearRequested={that.onCategorySuggestionsClearRequested}
                                      getSuggestionValue={getSuggestionValue}
                                      renderSuggestion={renderSuggestion}
                                      inputProps={inputProps}/>
                })}
              </div>
              <div>Total: {this.state.transactions[0].total_price} ({this.state.transactions[0].total_price_read})</div>
              <button onClick={this.saveReceipt}>Submit</button>
              <button onClick={this.deleteTransaction}>Delete</button>
            </div>
            <div className="receipt-text" style={{float:'left'}}>
              <pre>{this.state.transactions[0].receipts[0].text}</pre>
            </div>
          </div>
        </div>
      );
    }
    else return ("");
  }
}