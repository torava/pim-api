'use strict';

import axios from 'axios';
import React, {Component} from 'react';
const {createWorker, PSM} = Tesseract;

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
    console.time('process');
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
    
    img.onload = async event => {
      target_canvas.width = canvas.width = img.width;
      target_canvas.height = canvas.height = img.height;
      context.drawImage(img, 0, 0, img.width, img.height);
      src = cv.imread(canvas);
      dst = new cv.Mat();

      let bil = new cv.Mat();
      //let blu = new cv.Mat();

      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

      /*let angle = computeSkew(src);

      console.log(angle);

      src = deskew(src, angle, 0, true);*/

      //cv.bilateralFilter(src,bil,5,5,5);

      let ksize = new cv.Size(9,9);
      //cv.GaussianBlur(bil, bil, ksize, 0, 0, cv.BORDER_DEFAULT);

      cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 15, 15);//, 201, 30);

      /*let M= cv.Mat.ones(2, 2, cv.CV_8U);
        let anchor = new cv.Point(-1, -1);
        cv.dilate(dst, dst, M, anchor, 1);
        cv.erode(dst, dst, M, anchor, 2);*/

        /*let M = new cv.Mat();
        ksize = new cv.Size(3, 3);
        M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
        cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);*/

        let dsize = new cv.Size(2400, src.rows/src.cols*2400);
        cv.resize(dst,dst, dsize, 0, 0, cv.INTER_AREA);
        

      let imagedata = this.getSrc(dst, true);

      console.log('edited');
      console.timeLog('process');

      const tesseract_worker = createWorker({
        langPath: 'http://localhost:42808/lib/tessdata/fast',
        gzip: false,
        //logger: m => console.log(m)
      });
      await tesseract_worker.load();
      await tesseract_worker.loadLanguage('fin');
      await tesseract_worker.initialize('fin');
      await tesseract_worker.setParameters({
        //tessedit_pageseg_mode: PSM.AUTO_OSD,
        //tessedit_ocr_engine_mode: OEM.TESSERACT_ONLY,
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890.-',
        textord_max_noise_size: 50,
        //textord_noise_sizelimit: 1
        tessjs_create_osd: '1'
      });

      tesseract_worker.detect(imagedata)
      .then(result => {
        console.log('detected');
        console.timeLog('process');

        let rotate = result.data.orientation_degrees;
        console.log(rotate);
        dst = this.rotateImage(dst, 360-rotate);

        cv.imshow('canvas', dst, true);

        imagedata = this.getSrc(dst, true);
  
        tesseract_worker.recognize(imagedata,
          'fin'
          //tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890',
          //textord_max_noise_size: 50,
          //textord_noise_sizelimit: 1
        )
        //.progress(message => console.log(message))
        .catch(err => console.error(err))
        .then(result => {
          console.log('recognized');
          console.timeLog('process');

          let words = result.data.words,
              word,
              coords, distances = [],
              origwidth = src.cols,
              factor = 1,//dst.cols/origwidth,
              wrapper = document.getElementById('canvas-wrapper'),
              boxes = [],
              left, top, right, bottom, width, height,
              x_sum = 0,
              x_gravity,
              text,
              boundaries = {},
              rec = cv.Mat.zeros(dst.rows/dst.cols*400, 400, cv.CV_8U),
              factor_rec = rec.cols/dst.cols;

          console.log(dst.cols, dst.rows);

          for (let i in words) {
            word = words[i];
            if (!word.text || !word.text.trim()) continue;
            x_sum+= parseInt(word.bbox.x0)+parseInt(word.bbox.x1)/2;
          }

          x_gravity = x_sum/words.length;

          for (let i in words) {
            word = words[i];

            left = word.bbox.x0;
            top = word.bbox.y0;
            right = word.bbox.x1;
            bottom = word.bbox.y1;

            //if (!word.text || !word.text.trim() || right-left < 10 || bottom-top < 10 || word.confidence < 60 || word.text.length < 2) continue;
            console.log(word);

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

            let point1 = new cv.Point(left*factor_rec, top*factor_rec);
            let point2 = new cv.Point(right*factor_rec, bottom*factor_rec);
            let rectangleColor = new cv.Scalar(255, 255, 255);
            cv.rectangle(rec, point1, point2, rectangleColor, 1, cv.LINE_AA, 0);

            boxes.push((
              <div title={text+' conf '+word.confidence+' dist '+(left-x_gravity*factor)} onClick={event => event.target.outerHTML = ''} style={{
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

          let M = new cv.Mat();
          let ksize = new cv.Size(30, 30);
          M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
          cv.morphologyEx(rec, rec, cv.MORPH_CLOSE, M);

          M = cv.Mat.ones(35, 35, cv.CV_8U);
          let anchor = new cv.Point(-1, -1);
          cv.erode(rec, rec, M, anchor);
          cv.dilate(rec, rec, M, anchor);

          console.log('contours', this.getSrc(rec, true));
        
          let contours = new cv.MatVector();
          let hierarchy = new cv.Mat();
          cv.findContours(rec, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

          let cnt, current, area, biggest = 0;
        
          for (let n = 0; n < contours.size(); n++) {
            current = contours.get(n);
            area = cv.contourArea(current, false);
            if (area > biggest) {
              biggest = area;
              cnt = current;
            }
          }

          let con = cv.Mat.zeros(rec.rows, rec.cols, cv.CV_8UC3);

          let contoursColor = new cv.Scalar(255, 255, 255);

          cv.drawContours(con, contours, -1, contoursColor, 1, 8, hierarchy, 100);

          let rotatedRect = cv.minAreaRect(cnt);
          let vertices = cv.RotatedRect.points(rotatedRect);
          let rectangleColor = new cv.Scalar(0, 255, 0);
          // draw rotatedRect
          for (let i = 0; i < 4; i++) {
              cv.line(con, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
          }

          let rect = cv.boundingRect(cnt);
          rectangleColor = new cv.Scalar(255, 0, 0);

          console.log(rotatedRect, vertices);
        
          let point1 = new cv.Point(rect.x, rect.y);
          let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
          cv.rectangle(con, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

          let scale = dst.cols/rec.cols;
          let margin = 10,
          x = parseInt(Math.max((rect.x-margin)*scale, 0)),
          y = parseInt(Math.max((rect.y-margin)*scale, 0)),
          w = parseInt(Math.min((rect.width+margin*2)*scale, dst.cols-x)),
          h = parseInt(Math.min((rect.height+margin*2)*scale, dst.rows-y));

          console.log(rect);

              rect = new cv.Rect(x, y, w, h);

              console.log(rect, scale, src);

          let cropped = dst.roi(rect);
          
          cv.imshow('rectangles', rec);

          let dsize = new cv.Size(800, cropped.rows/cropped.cols*800);
          cv.resize(cropped, cropped, dsize, 0, 0, cv.INTER_AREA);

          cv.imshow('cropped', cropped);

          let imagedata = this.getSrc(cropped, true);
          
          console.log('cropped');
          console.timeLog('process');

          let cropped_words = [],
              cropped_lines = [];

          result.data.lines.forEach(line => {
            cropped_words = [];
            line.words.forEach(word => {
              console.log(word.text, word.bbox.x0, x, word.bbox.y0, y, word.bbox.x1, x+w, word.bbox.y1, y+h, word.bbox.x0 > x && word.bbox.y0 > y && word.bbox.x1 < x+w && word.bbox.y1 < y+h);
              if (word.bbox.x0 > x && word.bbox.y0 > y && word.bbox.x1 < x+w && word.bbox.y1 < y+h) {
                cropped_words.push(word.text);
              }
            });
            if (cropped_words.length) {
              cropped_lines.push(cropped_words.join(' '));
            }
          });

          console.log('cropped text');
          console.log(cropped_lines);
          console.timeLog('process');

          tesseract_worker.recognize(imagedata,
            'fin',
            //tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890.,-',
            //textord_max_noise_size: 50,
            //textord_noise_sizelimit: 1
          )
          .then(result => {
            console.log('recognized cropped');
            console.log(result);
            console.timeEnd('process');
            that.setState({
              boxes,
              distances
            });
          });

          src.delete();
          dst.delete();
          cropped.delete();
          rec.delete();
          con.delete();
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
        <canvas id="rectangles"/>
        <canvas id="cropped" style={{border:'1px solid gray'}}/>
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