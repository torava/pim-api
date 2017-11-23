'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import axios from 'axios';
import Cropper from 'react-cropper';
import moment from 'moment';

class ReceiptItem extends React.Component {
  render() {
    return (<div key={'item-'+this.props.i+'-'+this.props.state.version}>
            <input type="search" value={this.props.item.item_number || ''}
                                 onChange={this.props.onItemNumberChange.bind(this, this.props.i)}
                                 style={{width:'10em'}}/>
            <input type="search" value={this.props.item.quantity || ''}
                                 onChange={this.props.onItemQuantityChange.bind(this, this.props.i)}
                                 style={{width:'5em'}}/>
            <input type="search" value={this.props.item.measure || ''}
                                 onChange={this.props.onItemMeasureChange.bind(this, this.props.i)}
                                 style={{width:'5em'}}/>
            <select onChange={this.props.onItemUnitChange.bind(this, this.props.i)}>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
            </select>
            <input type="search" list="products"
                                 value={this.props.item.product && this.props.item.product.name || ''}
                                 onChange={this.props.onItemNameChange.bind(this, this.props.i)}
                   style={{width:'18em'}}/>
            <input type="search" list="categories"
                                 defaultValue={this.props.item.category && this.props.item.category.name || ''}
                                 onChange={this.props.onItemCategoryChange.bind(this, this.props.i)}
                                 style={{width:'11em'}}/>
            <input type="number" defaultValue={this.props.item.price ? parseFloat(this.props.item.price).toFixed(2) : ''}
                                 onChange={this.props.onItemPriceChange.bind(this, this.props.i)}
                                 step={.01} style={{width:'5em'}}/>
            <button onClick={this.props.onDeleteItem.bind(this, this.props.i)}>-</button>
            <button onClick={this.props.onAddItem.bind(this, this.props.i)}>+</button><br/>
            <div onClick={this.props.toggle.bind(this, 'details-'+this.props.i)}>Attributes</div>
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

    let that = this;

    this.toggle = this.toggle.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onUpload = this.onUpload.bind(this);
    this.saveReceipt = this.saveReceipt.bind(this);
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
    this.onAddItem = this.onAddItem.bind(this);
    this.onFlipLeft = this.onFlipLeft.bind(this);
    this.onFlipRight = this.onFlipRight.bind(this);
    this.onRotate = this.onRotate.bind(this);
    this.setData = this.setData.bind(this);
    this.state = {
      products: [],
      rotate: 0,
      rotate_adjust: 0,
      data: {},
      categories: [],
      transactions: []
    };
  }
  toggle(id, event) {
    let display = document.getElementById(id).style.display;
    console.log(display);
    document.getElementById(id).style.display = display == 'none' ? 'block' : 'none';
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
        that.setState({transactions: []});

        var transactions = [{receipts:[{file: response.data.file}]}];
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
        data = Object.assign({}, this.cropper.getData(), this.state.data);
    data.language = document.getElementById('language').value;

    //that.setState({});

    axios.post('/api/receipt/data/'+this. state.transactions[0].receipts[0].file, data)
    .then(function(response) {
      let state = response.data;
      state.version = Date.now();
      that.setState(state);
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
    transactions[0].items[key].quantity = event.target.value;

    this.setState({
      transactions: transactions
    });
  }
  onItemMeasureChange(key, event) {
    let transactions = this.state.transactions;
    transactions[0].items[key].measure = event.target.value;

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
  onItemCategoryChange(key, event) {
    let transactions = this.state.transactions;
    transactions[0].items[key].product.category = {name: event.target.value};

    /* todo add
    let categories = this.state.categories;
    categories.push({name:element.name}); */

    this.setState({
      transactions: transactions
    });
  }
  onFlipLeft(event) {
    let rotate = this.cropper.getData().rotate-90;
    if (rotate < 0) rotate = 360+rotate%360;
    this.cropper.rotateTo(rotate);
  }
  onFlipRight(event) {
    let rotate = this.cropper.getData().rotate+90;
    if (rotate < 0) rotate = 360+rotate%360;
    this.cropper.rotateTo(rotate); 
  }
  onRotate(event) {
    let previous = this.state.rotate_adjust;
    let rotate_adjust = parseFloat(event.target.value);
    this.setState({rotate_adjust:rotate_adjust});   

    let rotate = this.cropper.getData().rotate+rotate_adjust-previous;
    if (rotate < 0) rotate = 360+rotate%360;

    this.cropper.rotateTo(rotate);
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
  setData(attribute, event) {
    let data = this.state.data;
    data[attribute] = event.target.value;
    this.setState({
      data: data
    });
  }
  render() {
    let that = this,
        receiptIsRead = this.state.transactions.length && this.state.transactions[0].receipts[0].text,
        receiptContent = "";
    if (receiptIsRead) {
      receiptContent = (
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
          <datalist id="categories">
            {this.state.categories.map(function(item, i) {
              return <option value={item.name}/>
            })}
          </datalist>
          <div className="receipt-picture" style={{float:'left'}}>
            <img src={"/api/receipt/picture/"+this.state.transactions[0].receipts[0].file+"?"+this.state.version} style={{width:300}}/>
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
                  return <ReceiptItem item={item}
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
                                      toggle={that.toggle}/>
                })}
              </div>
              <div>Total: {this.state.transactions[0].total_price} ({this.state.transactions[0].total_price_read})</div>
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
        <button onClick={this.onFlipLeft}>Flip Left</button>
        <input type="range" min="-45" max="45" defaultValue="0" step="any" onChange={this.onRotate} style={{width:700}}/>
        <button onClick={this.onFlipRight}>Flip Right</button><br/>
        Details Less <input type="range" min="1" max="20" defaultValue="10" step="1" onChange={this.setData.bind(this, 'threshold')} style={{width:100, transform: 'rotate(-180deg)'}}/> More
        Soften None <input type="range" min="0" max="5" defaultValue="1" step="1" onChange={this.setData.bind(this, 'blur')} style={{width:50}}/> High
        Sharpen None <input type="range" min="0" max="5" defaultValue="3" step="1" onChange={this.setData.bind(this, 'sharpen')} style={{width:50}}/> High
        <Cropper id="cropper"
                 src={this.state.src}
                 style={{width:800,height:800}}
                 autoCropArea={1}
                 viewMode={0}
                 rotatable={true}
                 zoomable={false}
                 ref={cropper => {this.cropper = cropper; }}/>
        {receiptContent}
      </div>
    );
  }
};