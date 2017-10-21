'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import axios from 'axios';
import Cropper from 'react-cropper';
import moment from 'moment';
import { Creatable } from 'react-select';

class ReceiptItem extends React.Component {
  render() {
    return (<div key={this.props.i}>
            <input type="search" defaultValue={this.props.item.barcode || ''}/>
            <Creatable value={this.props.item.product.name || ''} options={this.props.state.products} labelKey="label" valueKey="name" onChange={this.props.onItemNameChange.bind(this, this.props.i)}/>
            <Creatable value={this.props.item.category.name || ''} options={this.props.state.categories} labelKey="label" valueKey="name" onChange={this.props.onItemCategoryChange.bind(this, this.props.i)}/>
            <input type="number" defaultValue={this.props.item.price ? parseFloat(this.props.item.price).toFixed(2) : ''}
                                 onChange={this.props.onItemPriceChange.bind(this, this.props.i)}
                                 step={.01} style={{width:'4em'}}/>
            <button onClick={this.props.onDeleteItem.bind(this, this.props.i)}>-</button>
            <button onClick={this.props.onAddItem.bind(this, this.props.i)}>+</button>
          </div>);  
  }
}

export default class addReceiptPage extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    this.onChange = this.onChange.bind(this);
    this.onUpload = this.onUpload.bind(this);
    this.saveReceipt = this.saveReceipt.bind(this);
    this.onItemPriceChange = this.onItemPriceChange.bind(this);
    this.onItemNameChange = this.onItemNameChange.bind(this);
    this.onItemCategoryChange = this.onItemCategoryChange.bind(this);
    this.onDeleteItem = this.onDeleteItem.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
    this.state = {
      products: [],
      categories: [],
      transactions: []
    };
  }
  onChange(event) {
    let that = this;
    event.preventDefault();

    that.setState({});

    let files;
    if (event.dataTransfer) {
      files = event.dataTransfer.files;
    } else if (event.target) {
      files = event.target.files;
    }

    if (!files[0]) return;

    var formData = new FormData();
      formData.append('file', files[0]);
      axios.post('/api/receipt/picture', formData)
      .then(function(response) {
        var transactions = [{receipts:[{id: response.data.file}]}];
        that.setState({transactions: transactions});
      })
      .catch(function(error) {
        console.error(error);
      });

    const reader = new FileReader();
    reader.onload = () => {
      this.setState({ src: reader.result });
    };
    reader.readAsDataURL(files[0]);
  }
  onUpload(event) {
    event.preventDefault();

    let that = this,
        data = this.cropper.getData();
    data.language = document.getElementById('language').value;

    //that.setState({});

    axios.post('/api/receipt/data/'+this.state.transactions[0].receipts[0].id, data)
    .then(function(response) {
      that.setState(response.data);
    })
    .catch(function(error) {
      console.error(error);
    });
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
  onItemNameChange(key, element) {
    if (!element)
      element = {name:''};

    let transactions = this.state.transactions;
    transactions[0].items[key].product.name = element.name;

    let products = this.state.products;
    products.push({name:element.name});

    this.setState({
      transactions: transactions,
      products: products
    });
  }
  onItemCategoryChange(key, element) {
    if (!element)
      element = {name:''};
      
    let transactions = this.state.transactions;
    transactions[0].items[key].category.name = element.name;

    let categories = this.state.categories;
    categories.push({name:element.name});

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
      transactions: transactions
    });
    //ReactDOM.findDOMNode(this).getElementsByClassName('receipt-items')[0].append(<ReceiptItem onDeleteItem={that.onDeleteItem} onAddItem={that.onAddItem} onItemPriceChange={that.onItemPriceChange}/>);

  }
  render() {
    let that = this,
        receiptIsRead = this.state.transactions.length && this.state.transactions[0].receipts[0].text,
        receiptContent = "";
    if (receiptIsRead) {
      receiptContent = (
        <div className="receipt-content">
          <div className="receipt-picture" style={{float:'left'}}>
            <img src={"/api/receipt/picture/"+this.state.transactions[0].receipts[0].file+"?"+Date.now()} style={{width:400}}/>
          </div>
          <div style={{float:'left'}}>
            <div className="receipt-editor" style={{float:'left'}}>
              <div>Store Name: <input type="search" defaultValue={this.state.transactions[0].party.name}/></div>
              <div>VAT: <input type="search" defaultValue={this.state.transactions[0].party.vat}/></div>
              <div>Street:
                <input type="search" defaultValue={this.state.transactions[0].party.street_name}/>
                <input type="search" defaultValue={this.state.transactions[0].party.street_number}/>
              </div>
              <div>Postal Code: <input type="search" defaultValue={this.state.transactions[0].party.postal_code}/></div>
              <div>City: <input type="search" defaultValue={this.state.transactions[0].party.city}/></div>
              <div>Phone Number: <input type="phone" defaultValue={this.state.transactions[0].party.phone_number}/></div>
              <div>Date: <input type="datetime-local" defaultValue={this.state.transactions[0].date && moment(this.state.transactions[0].date).format('YYYY-MM-DDTHH:mm:ss')}/></div>
              <div className="receipt-items">
                {this.state.transactions[0].items.map(function(item, i){
                  return <ReceiptItem
                                      i={i}
                                      item={item}
                                      state={that.state}
                                      onDeleteItem={that.onDeleteItem}
                                      onAddItem={that.onAddItem}
                                      onItemPriceChange={that.onItemPriceChange}
                                      onItemNameChange={that.onItemNameChange}
                                      onItemCategoryChange={that.onItemCategoryChange}/>
                })}
              </div>
              <div>Total: <input type="number" value={this.state.transactions[0].total_price}/> ({this.state.transactions[0].total_price_read})</div>
              <button onClick={this.saveReceipt}>Submit</button>
            </div>
            <div className="receipt-text" style={{float:'left'}}>
              <pre>{this.state.transactions[0].receipts[0].text}</pre>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="add-receipt">
        <form>
        <input type="file" name="file" id="file" multiple draggable onChange={this.onChange}/>
        <select placeholder="Language" name="language" id="language">
          <option value="fin">suomi</option>
          <option value="spa">español</option>
        </select>
        <button onClick={this.onUpload}>Submit</button>
        </form>
        <Cropper id="cropper"
                 src={this.state.src}
                 style={{width:600,height:800}}
                 autoCropArea={1}
                 viewMode={1}
                 rotatable={true}
                 zoomable={false}
                 ref={cropper => {this.cropper = cropper; }}/>
        {receiptContent}
      </div>
    );
  }
};