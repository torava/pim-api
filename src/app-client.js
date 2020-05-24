'use strict';
import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import App from './components/App';

// https://stackoverflow.com/questions/13626465/how-to-create-a-new-imagedata-object-independently
global.createCanvas = (width, height) => {
  let canvas = document.createElement('canvas');
  //var ctx = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

ReactDOM.hydrate((
  <BrowserRouter>
    <App/>
  </BrowserRouter>
), document.getElementById('app'));