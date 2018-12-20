'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import axios from 'axios';
import Cropper from 'react-cropper';
import moment from 'moment';

function confirmExit() {
    return "You have attempted to leave this page. Are you sure?";
}

const exif_rotation = {
  1: 0,
  3: 180,
  6: 270,
  8: 90
};

// thx https://gist.github.com/runeb/c11f864cd7ead969a5f0
function _arrayBufferToBase64( buffer ) {
  var binary = ''
  var bytes = new Uint8Array( buffer )
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode( bytes[ i ] )
  }
  return window.btoa( binary );
}
const imageOrientation = function (file, callback) {
  var fileReader = new FileReader();
  fileReader.onloadend = function () {
      var base64img = "data:" + file.type + ";base64," + _arrayBufferToBase64(fileReader.result);
      var scanner = new DataView(fileReader.result);
      var idx = 0;
      var value = 1; // Non-rotated is the default
      if (fileReader.result.length < 2 || scanner.getUint16(idx) != 0xFFD8) {
          // Not a JPEG
          if (callback) {
              callback(base64img, value);
          }
          return;
      }
      idx += 2;
      var maxBytes = scanner.byteLength;
      var littleEndian = false;
      while (idx < maxBytes - 2) {
          var uint16 = scanner.getUint16(idx, littleEndian);
          idx += 2;
          switch (uint16) {
              case 0xFFE1: // Start of EXIF
                  var endianNess = scanner.getUint16(idx + 8);
                  // II (0x4949) Indicates Intel format - Little Endian
                  // MM (0x4D4D) Indicates Motorola format - Big Endian
                  if (endianNess === 0x4949) {
                      littleEndian = true;
                  }
                  var exifLength = scanner.getUint16(idx, littleEndian);
                  maxBytes = exifLength - idx;
                  idx += 2;
                  break;
              case 0x0112: // Orientation tag
                  // Read the value, its 6 bytes further out
                  // See page 102 at the following URL
                  // http://www.kodak.com/global/plugins/acrobat/en/service/digCam/exifStandard2.pdf
                  value = scanner.getUint16(idx + 6, littleEndian);
                  maxBytes = 0; // Stop scanning
                  break;
          }
      }
      if (callback) {
          callback(base64img, value);
      }
  }
  fileReader.readAsArrayBuffer(file);
};

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
    this.onCrop = this.onCrop.bind(this);
    this.state = {
      products: [],
      //rotate: 0,
      rotate_adjust: 0,
      data: {
        threshold: 10,
        blur: 0,
        sharpen: 0,
        rotate: 0
      },
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

    //window.onbeforeunload = confirmExit;

    let files;
    if (event.dataTransfer) {
      files = event.dataTransfer.files;
    } else if (event.target) {
      files = event.target.files;
    }

    if (!files[0]) return;

    imageOrientation(files[0], (base64img, value) => {
      let rotate = exif_rotation[value];
      console.log(value);
      var img = new Image;
      img.onload = () => {
        /* http://devbutze.blogspot.com/2014/02/html5-canvas-offscreen-rendering.html
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, img.width, img.height);*/
        
        // crop

        let src = cv.imread(img, cv.CV_IMREAD_GRAYSCALE);
        let dst = src;
        //cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);

        let dsize = new cv.Size(800, src.rows/src.cols*800);
        cv.resize(src, src, dsize, 0, 0, cv.INTER_AREA);

        let width, height;
        if (rotate%180==90) {
          width = src.rows;
          height = src.cols;
        }
        else {
          width = src.cols;
          height = src.rows;
        }

        let center = new cv.Point(src.cols / 2, src.rows / 2);
        // You can try more different parameters
        let M = cv.getRotationMatrix2D(center, exif_rotation[value], 1);
        cv.warpAffine(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        /*let ksize = new cv.Size(60, 60);
        let anchor = new cv.Point(-1, -1);
        //cv.blur(src, dst, ksize, anchor, cv.BORDER_DEFAULT);
        cv.boxFilter(src, dst, -1, ksize, anchor, true, cv.BORDER_DEFAULT);*/

        let ksize = new cv.Size(59,59);
        //cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);

        //cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 5);

        // canny edge detection
        /*cv.Canny(dst, dst, 1, 300, 5, false);

        // find boundaries and crop

        let boundaries = {};

        for (let y = 0; y < dst.rows; y++) {
          for (let x = 0; x < dst.cols; x++) {
            let index = y*dst.cols*dst.channels()+x*dst.channels();
            let r = dst.data[index];
            let g = dst.data[index+1];
            let b = dst.data[index+2];

            if (r+g+b == 765) {
              if (boundaries.hasOwnProperty('left')) {
                boundaries.left = Math.min(x, boundaries.left);
                boundaries.top = Math.min(y, boundaries.top);
                boundaries.right = Math.max(x, boundaries.right);
                boundaries.bottom = Math.max(y, boundaries.bottom);
              }
              else {
                boundaries.left = x;
                boundaries.top = y;
                boundaries.right = x;
                boundaries.bottom = y;
              }
            } 
          }
        }

        console.log(dst,dst.rows,dst.cols,boundaries);

        let rect = new cv.Rect(
        Math.max(boundaries.left-15,0),
        Math.max(boundaries.top-15,0),
        Math.min(boundaries.right-boundaries.left+30,dst.cols-boundaries.left),
        Math.min(boundaries.bottom-boundaries.top+30,dst.rows-boundaries.top)
        );

        dst = src.roi(rect);*/

        // threshold

        //cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 71, 15);

        // dilate and erode
      
        let M2 = cv.Mat.ones(1, 1, cv.CV_8S);
        let anchor2 = new cv.Point(1, 1);

        //cv.dilate(dst, dst, M2, anchor2, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
        //cv.erode(dst, dst, M2, anchor2, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

        // create imagedata

        // https://stackoverflow.com/questions/13626465/how-to-create-a-new-imagedata-object-independently
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        canvas.width = dst.cols;
        canvas.height = dst.rows;

        var imagedata = ctx.createImageData(dst.cols, dst.rows);
        imagedata.data.set(dst.data);
        ctx.putImageData(imagedata, 0, 0);

        console.log(dst.cols, dst.rows, imagedata);

        this.setState({ src: canvas.toDataURL() });

        that.showAdjustments();

        var Tesseract = window.Tesseract;
        Tesseract.recognize(imagedata)
        .progress(message => console.log(message))
        .catch(err => console.error(err))
        .then(result => console.log(result));

        src.delete(); dst.delete();
      }
      img.src = base64img;
    });

    /*var formData = new FormData();
      formData.append('file', files[0]);
      axios.post('/api/receipt/prepare', formData)
      .then(function(response) {
        that.setState({transactions: []});

        var transactions = [{receipts:[{file: response.data.id}]}];
        that.setState({
          transactions,
          data: Object.assign({}, that.state.data, response.data.bounds)
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
    reader.readAsDataURL(files[0]);*/
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

    let data = Object.assign({}, this.state.data),
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
  setData(attribute, event, value) {
    let data = Object.assign({}, this.state.data);
    data[attribute] = value || event.target.value;
    this.setState({
      data: data
    });
  }
  onCrop() {
    this.setState({
      data: Object.assign({}, this.state.data, this.cropper.getData())
    });
  }
  onFlipLeft(event) {
    let rotate = this.state.data.rotate-90;
    if (rotate < 0) rotate = 360+rotate%360;
    this.setData('rotate', null, rotate);
  }
  onFlipRight(event) {
    let rotate = this.state.data.rotate+90;
    if (rotate < 0) rotate = 360+rotate%360;
    this.setData('rotate', null, rotate);
  }
  onRotate(event) {
    let previous = this.state.rotate_adjust;
    let rotate_adjust = parseFloat(event.target.value);
    this.setState({rotate_adjust:rotate_adjust});   

    let rotate = this.state.data.rotate+rotate_adjust-previous;
    if (rotate < 0) rotate = 360+rotate%360;

    //this.cropper.rotateTo(rotate);

    this.setData('rotate', null, rotate);
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
              <input type="range"
                     min="-45"
                     max="45"
                     value={this.state.rotate_adjust}
                     step="any"
                     onChange={this.onRotate}
                     style={{width:'75%'}}
              />
              <button onClick={this.onFlipRight}><i className="fa fa-redo"/></button><br/>
              Details
              <i className="fa fa-minus"/>
              <input type="range"
                    min="1"
                    max="30"
                    value={this.state.data.threshold}
                    step="1"
                    onChange={this.setData.bind(this, 'threshold')}
                    style={{width:100, transform: 'rotate(-180deg)'}}
              />
              <i className="fa fa-plus"/>&nbsp;
              Soften
              <i className="fa fa-minus"/>
              <input type="range"
                     min="0"
                     max="5"
                     value={this.state.data.blur}
                     step="1"
                     onChange={this.setData.bind(this, 'blur')}
                     style={{width:50}}
              />
              <i className="fa fa-plus"/>&nbsp;
              Sharpen
              <i className="fa fa-minus"/>
              <input type="range"
                     min="0"
                     max="5"
                     value={this.state.data.sharpen}
                     step="1"
                     onChange={this.setData.bind(this, 'sharpen')}
                     style={{width:50}}
              />
              <i className="fa fa-plus"/>&nbsp;
            </fieldset>
            {this.state.src && <div>Crop</div>}
            <img src={this.state.src}/>
            <Cropper id="cropper"
                    src={this.state.src}
                    style={{width:'300px', maxHeight:'300px'}}
                    autoCropArea={1}
                    autoCrop={true}
                    data={this.state.data}
                    viewMode={0}
                    rotatable={true}
                    zoomable={false}
                    ref={cropper => {this.cropper = cropper}}
                    cropend={this.onCrop.bind(this)}
                    zoom={this.onCrop.bind(this)}
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