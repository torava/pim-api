'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import axios from 'axios';
import Cropper from 'react-cropper';
import moment from 'moment';

class ReceiptItem extends React.Component {
  render() {
    return (<div key={this.props.i}>
            <input type="search" value={this.props.item.id || ''}/>
            <input type="search" value={this.props.item.name || ''}/>
            <input type="number" defaultValue={this.props.item.price ? parseFloat(this.props.item.price).toFixed(2) : ''}
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
    this.onItemPriceChange = this.onItemPriceChange.bind(this);
    this.onDeleteItem = this.onDeleteItem.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
    this.state = {
      src: "",
      id: null,
      receiptData: {},
      receiptText: null,
      receiptItems: {}
    }
  }
  onChange(event) {
    let that = this;
    event.preventDefault();

    that.setState({receiptData: {} });

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
        that.setState({id: response.data.file});
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
    let that = this;
    axios.post('/api/receipt/data/'+this.state.id, this.cropper.getData())
    .then(function(response) {
      that.setState({
        receiptData: response.data.metadata,
        receiptText: response.data.text,
        receiptItems: response.data.items
      });
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  onItemPriceChange(key, event) {
    let receiptItems = this.state.receiptItems;
    receiptItems[key].price = parseFloat(event.target.value);
    this.setState({
      receiptItems: receiptItems
    });

    let receiptData = this.state.receiptData,
        total_price = 0;
    for (let i in receiptItems) {
      total_price+= receiptItems[i].price;
    }
    receiptData.total_price_computed = total_price;
    this.setState({
      receiptData: receiptData
    });
  }
  onDeleteItem(key, event) {
    //e.target.parentNode.outerHTML = '';
    let receiptItems = this.state.receiptItems;
    receiptItems.splice(key, 1);
    this.setState({
      receiptItems: receiptItems
    });
  }
  onAddItem(key, event) {
    let receiptItems = this.state.receiptItems;
    receiptItems.splice(key, 0, {});
    this.setState({
      receiptItems: receiptItems
    });
    //ReactDOM.findDOMNode(this).getElementsByClassName('receipt-items')[0].append(<ReceiptItem onDeleteItem={that.onDeleteItem} onAddItem={that.onAddItem} onItemPriceChange={that.onItemPriceChange}/>);

  }
  render() {
    let that = this,
        receiptIsRead = this.state.receiptText,
        receiptContent = "";
    if (receiptIsRead) {
      receiptContent = (
        <div className="receipt-content">
          <div className="receipt-picture" style={{float:'left'}}>
            <img src={"/api/receipt/picture/"+this.state.id} style={{width:400}}/>
          </div>
          <div style={{float:'left'}}>
            <div className="receipt-editor" style={{float:'left'}}>
              <div>From {this.state.receiptData.store} {this.state.receiptData.vat}, {this.state.receiptData.street}</div>
              <div>Date <input type="datetime-local" value={this.state.receiptData.date && moment(this.state.receiptData.date).format('YYYY-MM-DDTHH:mm:ss')}/></div>
              <div className="receipt-items">
              {this.state.receiptItems.map(function(item, i){
                return <ReceiptItem i={i} item={item} onDeleteItem={that.onDeleteItem} onAddItem={that.onAddItem} onItemPriceChange={that.onItemPriceChange}/>
              })}
              </div>
              <div>Total: <input type="number" value={this.state.receiptData.total_price_computed && this.state.receiptData.total_price_computed.toFixed(2)}/> ({this.state.receiptData.total_price && this.state.receiptData.total_price.toFixed(2)})</div>
            </div>
            <div className="receipt-text" style={{float:'left'}}>
              <pre>{this.state.receiptText}</pre>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="add-receipt">
        v5
        <input type="file" name="file" id="file" multiple draggable onChange={this.onChange}/>
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