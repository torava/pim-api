'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import axios from 'axios';
import Cropper from 'react-cropper';
import moment from 'moment';
import ReceiptEditor from './ReceiptEditor';

function confirmExit() {
    return "You have attempted to leave this page. Are you sure?";
}

export default class AddReceiptPage extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    this.onChange = this.onChange.bind(this);
    this.showUploader = this.showUploader.bind(this);
    this.showAdjustments = this.showAdjustments.bind(this);
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
      mode: 'uploader',
      uploading: false,
      categories: [],
      manufacturers: [],
      transactions: [],
      cropper_data: null,
      version: 0
    };
  }
  onChange(event) {
    let that = this;
    event.preventDefault();

    that.setState({});

    window.onbeforeunload = confirmExit;

    let files;
    if (event.dataTransfer) {
      files = event.dataTransfer.files;
    } else if (event.target) {
      files = event.target.files;
    }

    if (!files[0]) return;

    var formData = new FormData();
      formData.append('file', files[0]);
      axios.post('/api/receipt/prepare', formData)
      .then(function(response) {
        that.setState({transactions: []});

        var transactions = [{receipts:[{file: response.data.id}]}];
        that.setState({
          transactions,
          cropper_data: response.data.bounds
        });

        that.showAdjustments();
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
    let state = Object.assign({}, this.state);
    state.mode = 'uploader';
    this.setState(state);
  }
  showAdjustments(event) {
    event && event.preventDefault();
    let state = Object.assign({}, this.state);
    state.mode = 'adjustments';
    this.setState(state);
  }
  showEditor(state) {
    state.mode = 'editor';
    
    // Update version
    state.version = Date.now();

    state.uploading = false;

    this.setState(state);

    console.log(this.state);
  }
  onUpload(event) {
    event.preventDefault();

    this.setState(Object.assign({}, this.state, {uploading: true}));

    let data = Object.assign({}, this.cropper.getData(), this.state.data),
        that = this;

    data.language = document.getElementById('language').value;

    //that.setState({});

    axios.post('/api/receipt/data/'+this.state.transactions[0].receipts[0].file, data)
    .then(function(response) {
      that.showEditor(response.data);
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
        {this.state.mode == 'uploader' || this.state.mode == 'adjustments' ? 
        <div>
          <div id="uploader">
            <a href="#" className="next" onClick={this.onUpload} style={{float:"right"}}>
              {
                this.state.uploading ?
                <i className="fa fa-spinner fa-spin">&nbsp;</i> :
                'Next'
              }
            </a>
            <div style={{clear:"both"}}/>
            <form>
              <fieldset>
                <legend>Upload</legend>
                <input type="file" name="file" id="file" multiple draggable onChange={this.onChange}/>
                <select placeholder="Language" name="language" id="language">
                  <option value="fi-FI">suomi</option>
                  <option value="en-EN">English</option>
                  <option value="es-AR">español</option>
                </select>
              </fieldset>
            </form>
          </div>
          {this.state.mode == 'adjustments' ?
          <div id="receipt-adjustments">
            <div style={{clear:"both"}}/>
            <fieldset>
              <legend>Adjust</legend>
              <button onClick={this.onFlipLeft}><i className="fa fa-undo"/></button>
              <input type="range" min="-45" max="45" defaultValue="0" step="any" onChange={this.onRotate} style={{width:'75%'}}/>
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
              Soften <i className="fa fa-minus"/> <input type="range" min="0" max="5" defaultValue="0" step="1" onChange={this.setData.bind(this, 'blur')} style={{width:50}}/> <i className="fa fa-plus"/>&nbsp;
              Sharpen <i className="fa fa-minus"/> <input type="range" min="0" max="5" defaultValue="0" step="1" onChange={this.setData.bind(this, 'sharpen')} style={{width:50}}/> <i className="fa fa-plus"/>&nbsp;
            </fieldset>
            {this.state.src && <div>Crop</div>}
            <Cropper id="cropper"
                    src={this.state.src}
                    style={{width:'95%', maxHeight:'700px'}}
                    autoCropArea={1}
                    autoCrop={true}
                    data={this.state.cropper_data}
                    viewMode={0}
                    rotatable={true}
                    zoomable={true}
                    ref={cropper => {this.cropper = cropper}}
            />
          </div> :
          ''}
        </div>
        : ''}
        {this.state.mode == 'editor' ?
        <div id="receipt-editor">
          <a href="#" className="previous" onClick={this.showAdjustments} style={{float:"left"}}>Previous</a>
          <ReceiptEditor id="receipt-editor"
                         version={this.state.version}
                         products={this.state.products}
                         manufacturers={this.state.manufacturers}
                         categories={this.state.categories}
                         transactions={this.state.transactions}
                         showAdjustments={this.showAdjustments}/>
        </div>
        : ''}
      </div>
    );
  }
};