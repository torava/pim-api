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
            <input type="search" class="item-id" value={this.props.item.id || ''}/>
            <input type="search" class="item-name" value={this.props.item.name || ''}/>
            <input type="number" class="item-price" defaultValue={this.props.item.price ? parseFloat(this.props.item.price).toFixed(2) : ''}
                                 onChange={this.props.onItemPriceChange.bind(this, this.props.i)}
                                 step={.01}/>
            <button onClick={this.props.onDeleteItem.bind(this, this.props.i)}>-</button>
            <button onClick={this.props.onAddItem.bind(this, this.props.i)}>+</button>
          </div>);  
  }
}

export default class addReceiptPage extends React.Component {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
    this.onUpload = this.onUpload.bind(this);
    this.saveReceipt = this.saveReceipt.bind(this);
    this.onItemPriceChange = this.onItemPriceChange.bind(this);
    this.onDeleteItem = this.onDeleteItem.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
    this.state = {}
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
    let that = this,
        data = this.cropper.getData();
    data.language = document.getElementById('language').value;

    that.setState({});

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
        receiptIsRead = this.state.transactions && this.state.transactions[0].receipts[0].text,
        receiptContent = "";
    if (receiptIsRead) {
      receiptContent = (
        <div className="receipt-content">
          <div className="receipt-picture" style={{float:'left'}}>
            <img src={"/api/receipt/picture/"+this.state.transactions[0].receipts[0].file+"?"+Date.now()} style={{width:400}}/>
          </div>
          <div style={{float:'left'}}>
            <div className="receipt-editor" style={{float:'left'}}>
              <div>Store Name: <input type="search" value={this.state.transactions[0].party.name}/></div>
              <div>VAT: <input type="search" value={this.state.transactions[0].party.vat}/></div>
              <div>Street:
                <input type="search" value={this.state.transactions[0].party.street_name}/>
                <input type="search" value={this.state.transactions[0].party.street_number}/>
              </div>
              <div>Postal Code: <input type="search" value={this.state.transactions[0].party.postal_code}/></div>
              <div>City: <input type="search" value={this.state.transactions[0].party.city}/></div>
              <div>Phone Number: <input type="phone" value={this.state.transactions[0].party.phone_number}/></div>
              <div>Date: <input type="datetime-local" value={this.state.transactions[0].date && moment(this.state.transactions[0].date).format('YYYY-MM-DDTHH:mm:ss')}/></div>
              <div className="receipt-items">
                {this.state.transactions[0].items.map(function(item, i){
                  return <ReceiptItem i={i} item={item} onDeleteItem={that.onDeleteItem} onAddItem={that.onAddItem} onItemPriceChange={that.onItemPriceChange}/>
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
        v5
        <input type="file" name="file" id="file" multiple draggable onChange={this.onChange}/>
        <select placeholder="Language" name="language" id="language">
          <option value="eng">English</option>
          <option value="fin">suomi</option>
          <option value="spa">español</option>
        </select>
        <button onClick={this.onUpload}>Submit</button>
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