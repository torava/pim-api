'use strict';

import axios from 'axios';
import React, {Component} from 'react';

export default class TextBoxTool extends Component {
  constructor(props) {
    super(props);

    this.onChange = this.onChange.bind(this);
    this.state = {
      boxes: []
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

    let img = document.getElementById('img'),
        formData = new FormData(),
        origimg = new Image(),
        reader = new FileReader();

    reader.readAsDataURL(files[0]);
    reader.onload = (e) => {
      origimg.src = e.target.result;
      img.src = e.target.result;
    }

    formData.append('file', files[0]);
    axios.post('/api/receipt/hocr', formData)
    .then((response) => {
      img.src = '/api/receipt/picture/'+response.data.id;
      img.onload = () => {
        let result = document.getElementById('result');

        result.innerHTML = response.data.hocr;

        let words = result.getElementsByClassName('ocrx_word'),
            coords,
            origwidth = img.naturalWidth,
            factor = img.width/origwidth,
            wrapper = document.getElementById('canvas-wrapper'),
            boxes = [],
            left, top, right, bottom, width, height,
            boundaries = {};

        console.log(img.width, origimg.width);

        for (let i in words) {
          console.log(words[i].innerHTML);
          if (!words[i].innerText || !words[i].innerText.trim()) continue;
          coords = words[i].title.split(';')[0].substring(5).split(' ');
          left = coords[0];
          top = coords[1];
          right = coords[2];
          bottom = coords[3];

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

          boxes.push((
            <div title={words[i].innerText} style={{
              left,
              top,
              width,
              height,
              border: '1px solid blue',
              position: 'absolute'
            }}/>
          ));
        }
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
        that.setState({boxes});
      }
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  render() {
    return (
      <div>
        <input type="file" name="file" id="file" multiple draggable onChange={this.onChange} style={{display:"block"}}/>
        <div id="result" style={{display:'none'}}/>
        <div id="canvas-wrapper" style={{position:"relative"}}>
          <img id="img" style={{width:'500px'}}/>
          {this.state.boxes}
        </div>
      </div>
    )
  }
}