'use strict';

import axios from 'axios';
import React, {Component} from 'react';
import { createGzip } from 'zlib';

export default class TextBoxTool extends Component {
  constructor(props) {
    super(props);

    this.onChange = this.onChange.bind(this);
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

    let img = new Image(),
        formData = new FormData(),
        origimg = new Image(),
        reader = new FileReader();

    reader.readAsDataURL(files[0]);
    reader.onload = (e) => {
      origimg.src = e.target.result;
    }

    formData.append('file', files[0]);
    axios.post('/api/receipt/prepare/', formData)
    .then((response) => {
      img.onload = () => {
        let ctx = that.refs.canvas.getContext('2d'),
            bounds = response.data.bounds,
            ratio = 100/origimg.width;

        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, 100, img.height/img.width*100);

        ctx.strokeStyle = 'red';
        ctx.strokeRect(bounds.x*ratio, bounds.y*ratio, bounds.width*ratio, bounds.height*ratio);
        /*
        ctx.beginPath();
        ctx.moveTo(bounds.nw[0], bounds.nw[1]);
        ctx.lineTo(bounds.ne[0], bounds.ne[1]);
        ctx.lineTo(bounds.se[0], bounds.se[1]);
        ctx.lineTo(bounds.sw[0], bounds.sw[1]);
        ctx.closePath();
        ctx.stroke();
        */
      }
      img.src = '/api/receipt/original/'+response.data.id;
    })
    .catch(function(error) {
      console.error(error);
    });
  }
  render() {
    return (
      <div>
        <input type="file" name="file" id="file" multiple draggable onChange={this.onChange} style={{display:"block"}}/>
        <canvas ref="canvas"/>
      </div>
    )
  }
}