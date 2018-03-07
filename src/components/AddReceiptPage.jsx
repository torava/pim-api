'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import axios from 'axios';
import Cropper from 'react-cropper';
import moment from 'moment';
import ReceiptEditor from './ReceiptEditor';

export default class addReceiptPage extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    this.onChange = this.onChange.bind(this);
    this.showUploader = this.showUploader.bind(this);
    this.onUpload = this.onUpload.bind(this);
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
      manufacturers: [],
      transactions: [],
      version: 0
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
  showUploader(event) {
    event.preventDefault();

    document.getElementById('uploader').style.display = 'block';
    document.getElementById('receipt-editor').style.display = 'none';
  }
  onUpload(event) {
    event.preventDefault();

    document.getElementsByClassName('next')[0].className = 'next fa fa-spinner';

    let that = this,
        data = Object.assign({}, this.cropper.getData(), this.state.data);
    data.language = document.getElementById('language').value;

    //that.setState({});

    axios.post('/api/receipt/data/'+this.state.transactions[0].receipts[0].file, data)
    .then(function(response) {
      document.getElementsByClassName('next').className = 'next';
  
      document.getElementById('receipt-editor').style.display = 'block';
      document.getElementById('uploader').style.display = 'none';

      let state = response.data;

      // Update version
      state.version = Date.now();

      that.setState(state);

      console.log(that.state);
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  setData(attribute, event) {
    let data = this.state.data;
    data[attribute] = event.target.value;
    this.setState({
      data: data
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
  
  render() {
    return (
      <div className="add-receipt">
        <div id="uploader">
          <a href="#" className="next" onClick={this.onUpload} style={{float:"right"}}>Next</a>
          <div style={{clear:"both"}}/>
          <form>
            <fieldset>
              <legend>Upload</legend>
              <input type="file" name="file" id="file" multiple draggable onChange={this.onChange}/>
              <select placeholder="Language" name="language" id="language">
                <option value="fin">suomi</option>
                <option value="eng">English</option>
                <option value="spa">español</option>
              </select>
            </fieldset>
          </form>
          <fieldset>
            <legend>Adjust</legend>
            <button onClick={this.onFlipLeft}><i className="fa fa-undo"/></button>
            <input type="range" min="-45" max="45" defaultValue="0" step="any" onChange={this.onRotate} style={{width:'90%'}}/>
            <button onClick={this.onFlipRight}><i className="fa fa-redo"/></button><br/>
            Details
            <i className="fa fa-minus"/>
            <input type="range"
                  min="1"
                  max="30"
                  defaultValue="10"
                  step="1"
                  onChange={this.setData.bind(this, 'threshold')}
                  style={{width:100, transform: 'rotate(-180deg)'}}
            />
            <i className="fa fa-plus"/>&nbsp;
            Soften <i className="fa fa-minus"/> <input type="range" min="0" max="5" defaultValue="1" step="1" onChange={this.setData.bind(this, 'blur')} style={{width:50}}/> <i className="fa fa-plus"/>&nbsp;
            Sharpen <i className="fa fa-minus"/> <input type="range" min="0" max="5" defaultValue="1" step="1" onChange={this.setData.bind(this, 'sharpen')} style={{width:50}}/> <i className="fa fa-plus"/>&nbsp;
          </fieldset>
          <Cropper id="cropper"
                  src={this.state.src}
                  style={{width:'95%', maxHeight:'600px'}}
                  autoCropArea={1}
                  viewMode={0}
                  rotatable={true}
                  zoomable={true}
                  ref={cropper => {this.cropper = cropper}}/>
        </div>
        <div id="receipt-editor" style={{display:"none"}}>
          <a href="#" className="previous" onClick={this.showUploader} style={{float:"left"}}>Previous</a>
          <ReceiptEditor id="receipt-editor"
                         version={this.state.version}
                         products={this.state.products}
                         manufacturers={this.state.manufacturers}
                         categories={this.state.categories}
                         transactions={this.state.transactions}
                         saveReceipt={this.saveReceipt}/>
        </div>
      </div>
    );
  }
};