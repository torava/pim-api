'use strict';

import axios from 'axios';
import React, {Component} from 'react';

function deskew( mat, angle, reqid = '0', drawGrid = false ) {
  angle = angle || computeSkew( mat.cvtColor(cv.COLOR_BGR2GRAY).bitwiseNot() );

  let nGray = mat.cvtColor(cv.COLOR_BGR2GRAY),
    mGray = nGray.bilateralFilter( 10, 60, 60 ),
    mEdge = mGray.canny(0 , 1, 5),
    contours = mEdge.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE),
    rotatedRect = contours.sort( (c0, c1) => c1.area - c0.area )[0].minAreaRect(),
    initCAngle = rotatedRect.angle,
    contourAngle = rotatedRect.size.width < rotatedRect.size.height ? initCAngle + 90 : initCAngle;

  return mat.warpAffine( cv.getRotationMatrix2D( new cv.Point( mat.cols / 2, mat.rows / 2 ), contourAngle ) );
}

function computeSkew( mat ) { // mat is expected to already be grayscale and inverted
  let [ height, width ] = mat.sizes,
    lines = mat.houghLinesP(1, Math.PI/180, 100, minLineLength = width / 2.0, maxLineGap = 20),
    angle = lines.reduce((ac, line, index) => {
      return ac + Math.atan2( line.w - line.x, line.z - line.y )
    }, 0);

  return angle / lines.length * 180 / Math.PI;
}

export default class TextBoxTool extends Component {
  constructor(props) {
    super(props);

    this.onChange = this.onChange.bind(this);
    this.state = {
      boxes: [],
      distances: []
    }
  }
  onChange(event) {
    let that = this;

    event.preventDefault();

    let files;
    if (event.dataTransfer) {
      files = event.dataTransfer.files;
    } else if (event.target) {
      files = event.target.files;
    }

    if (!files[0]) return;

    let formData = new FormData(),
        img = new Image(),
        reader = new FileReader(),
        canvas = document.createElement('canvas'),
        target_canvas = document.getElementById('canvas'),
        context = canvas.getContext('2d'),
        src, dst;

    reader.readAsDataURL(files[0]);
    
    img.onload = (e) => {
      target_canvas.width = canvas.width = img.width;
      target_canvas.height = canvas.height = img.height;
      context.drawImage(img, 0, 0, img.width, img.height);
      src = cv.imread(canvas);
      dst = new cv.Mat();

      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

      /*let angle = computeSkew(src);

      console.log(angle);

      src = deskew(src, angle, 0, true);*/

      cv.bilateralFilter(src,dst,7,200,200);
      cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 201, 15);

      let imagedata = this.getSrc(dst, true);

      var Tesseract = window.Tesseract;

      Tesseract.detect(imagedata)
      .then(result => {
        let dsize = new cv.Size(500, dst.rows/dst.cols*500);
        cv.resize(dst, dst, dsize, 0, 0, cv.INTER_AREA);

        let rotate = result.orientation_degrees;
        console.log(rotate);
        dst = this.rotateImage(dst, 360-rotate);

        cv.imshow('canvas', dst);

        imagedata = this.getSrc(dst, true);
  
        Tesseract.recognize(imagedata, {
          lang: 'fin',
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890,.- ',
          textord_max_noise_size: 50,
          textord_noise_sizelimit: 1
        })
        //.progress(message => console.log(message))
        .catch(err => console.error(err))
        .then(result => {
          let words = result.words,
              word,
              coords, distances = [],
              origwidth = img.naturalWidth,
              factor = img.width/origwidth,
              wrapper = document.getElementById('canvas-wrapper'),
              boxes = [],
              left, top, right, bottom, width, height,
              x_sum = 0,
              x_gravity,
              text,
              boundaries = {};

          console.log(img.width, origwidth);

          for (let i in words) {
            word = words[i];
            if (!word.text || !word.text.trim()) continue;
            x_sum+= parseInt(word.bbox.x0)+parseInt(word.bbox.x1)/2;
          }

          x_gravity = x_sum/words.length;

          for (let i in words) {
            word = words[i];
            if (!word.text || !word.text.trim() || word.confidence < 60) continue;
            console.log(word);
            left = word.bbox.x0;
            top = word.bbox.y0;
            right = word.bbox.x1;
            bottom = word.bbox.y1;

            if (boundaries.hasOwnProperty('left')) {
              boundaries.left = Math.min(left, boundaries.left);
              boundaries.top = Math.min(top, boundaries.top);
              boundaries.right = Math.max(right, boundaries.right);
              boundaries.bottom = Math.max(bottom, boundaries.bottom);
            }
            else {
              boundaries.left = left;
              boundaries.top = top;
              boundaries.right = right;
              boundaries.bottom = bottom;
            }

            left*= factor;
            top*= factor;
            right*= factor;
            bottom*= factor;

            width = right-left;
            height = bottom-top;

            text = word.text;

            boxes.push((
              <div title={text+' conf '+word.confidence+' dist '+(left-x_gravity*factor)} style={{
                left,
                top,
                width,
                height,
                border: '1px solid blue',
                position: 'absolute'
              }}/>
            ));
            distances.push(
              <li data-distance={left-x_gravity*factor}>{text} {left-x_gravity*factor}</li>
            );
          }

          distances.sort((a,b) => {
            return a.props['data-distance'] < b.props['data-distance']
          });

          console.log(boundaries);

          boxes.unshift((
            <div style={{
              left: boundaries.left*factor,
              top: boundaries.top*factor,
              width: (boundaries.right-boundaries.left)*factor,
              height: (boundaries.bottom-boundaries.top)*factor,
              border: '1px solid red',
              position: 'absolute'
            }}/>
          ));
          boxes.unshift(
            <div style={{
              left: x_gravity*factor,
              top: 0,
              width: 0,
              height: img.height,
              border: '1px solid red',
              position: 'absolute'
            }}/>
          );
          boxes.unshift(
            <div style={{
              left: words[Math.floor(words.length/2)].bbox.x0*factor,
              top: 0,
              width: 0,
              height: img.height,
              border: '1px solid blue',
              position: 'absolute'
            }}/>
          );
          that.setState({
            boxes,
            distances
          });

          src.delete();
          dst.delete();
        })
        .catch(function(error) {
          console.error(error);
        });
      })
      .catch(function(error) {
        console.error(error);
      });
    }
    img.src = URL.createObjectURL(files[0]);

  }
  getSrc(orig, from_grayscale) {
    let src;
    if (from_grayscale) {
      src = new cv.Mat(); 
      cv.cvtColor(orig, src, cv.COLOR_GRAY2RGBA, 0);
    }
    else {
      src = orig;
    }

    // https://stackoverflow.com/questions/13626465/how-to-create-a-new-imagedata-object-independently
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    canvas.width = src.cols;
    canvas.height = src.rows;

    console.log(src);

    let imagedata = ctx.createImageData(src.cols, src.rows);
    imagedata.data.set(src.data);
    ctx.putImageData(imagedata, 0, 0);

    return canvas.toDataURL();
  }
  rotateImage(src, rotate) {
    if (rotate < 0) {
      rotate = 360+rotate;
    }
    if (rotate == 270){
      cv.transpose(src, src); 
      cv.flip(src, src, 1);
    }
    else if (rotate == 90) {
      cv.transpose(src, src);  
      cv.flip(src, src, 0);
    }
    else if (rotate == 180){
      cv.flip(src, src, -1);
    }
    else if (!rotate) {}
    else {
      // get rotation matrix for rotating the image around its center in pixel coordinates
      let center = new cv.Point((src.cols-1)/2.0, (src.rows-1)/2.0);
      let rot = cv.getRotationMatrix2D(center, rotate, 1.0);
      // determine bounding rectangle, center not relevant
      let bbox = new cv.RotatedRect(new cv.Point(), src.size(), rotate);
      console.log(bbox);
      // adjust transformation matrix
      rot.data[0+src.rows*2]+= bbox.size.width/2.0 - src.cols/2.0;
      rot.data[1+src.rows*2]+= bbox.size.height/2.0 - src.rows/2.0;
      //rot.at<double>(0,2) += bbox.width/2.0 - src.cols/2.0;
      //rot.at<double>(1,2) += bbox.height/2.0 - src.rows/2.0;

      cv.warpAffine(src, src, rot, new cv.Size(bbox.size.width, bbox.size.height));
    }
    return src;
  }
  render() {
    return (
      <div>
        <input type="file" name="file" id="file" multiple draggable onChange={this.onChange} style={{display:"block"}}/>
        <div id="result" style={{display:'none'}}/>
        <div id="canvas-wrapper" style={{position:"relative"}}>
          <canvas id="canvas"/>
          <img id="img" style={{width:'500px'}}/>
          {this.state.boxes}
        </div>
        <ul>{this.state.distances}</ul>
      </div>
    )
  }
}