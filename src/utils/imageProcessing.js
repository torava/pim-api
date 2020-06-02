export function getSrc(orig, from_grayscale) {
  let src;
  if (from_grayscale) {
    src = new cv.Mat(); 
    cv.cvtColor(orig, src, cv.COLOR_GRAY2RGBA, 0);
  }
  else {
    src = orig;
  }

  const canvas = createCanvas(src.cols, src.rows);

  console.log('src', src);

  /*let imagedata = ctx.createImageData(src.cols, src.rows);
  imagedata.data.set(src.data);
  ctx.putImageData(imagedata, 0, 0);*/

  cv.imshow(canvas, src);

  const data_url = canvas.toDataURL();

  if (from_grayscale) {
    src.delete();
  }

  return data_url;
}

export function getCVSrcFromBase64(base64Data) {
  try {
    const image = new Image();
    image.src = base64Data;
    let src = cv.imread(image);
    return src;
  } catch(error) {
    console.error('Error while reading receipt for recognition', error);
    return;
  }
}

// Decoding base64 image
// Source: http://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
export function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  var response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = Buffer.from(matches[2], 'base64');

  return response;
}

export function getBufferFromCVSrc(src) {
  const canvas = createCanvas(src.cols, src.rows);
  cv.imshow(canvas, src);
  const buffer = canvas.toBuffer();
  return buffer;
}

export function extractBarCode(orig) {
  try {
    let s, M, ksize, dsize, anchor;
    let dst = new cv.Mat();
    console.log('dst', dst);
    let rect = new cv.Rect(0,orig.rows*0.85,orig.cols,orig.rows*0.15);
    console.log('rect', rect);
    dst = orig.roi(rect);
    console.log('dst', dst, dst.cols, dst.rows);
    
    let absDstx = new cv.Mat();
    let absDsty = new cv.Mat();
    let absDst = new cv.Mat();
    dsize = new cv.Size(800, dst.rows/dst.cols*800);
    cv.resize(dst, dst, dsize, 0, 0, cv.INTER_AREA);
    cv.cvtColor(dst, dst, cv.COLOR_RGB2GRAY, 0);
    
    s = new cv.Scalar(255,255,255,255);
    cv.copyMakeBorder(dst, dst, 200, 200, 200, 200, cv.BORDER_CONSTANT, s);

    ksize = new cv.Size(35,35);
    cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);

    M = new cv.Mat();
    ksize = new cv.Size(49,49);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, absDst, cv.MORPH_OPEN, M);


    M = cv.Mat.ones(7,7, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.dilate(absDst, absDst, M, anchor,6);
    cv.erode(absDst, absDst, M, anchor,6);

    cv.threshold(absDst, absDst, 150, 255, cv.THRESH_BINARY_INV);

    rect = new cv.Rect(200,200,absDst.cols-400,absDst.rows-400);
    console.log('rect', rect);
    absDst = absDst.roi(rect);

    dsize = new cv.Size(orig.cols, orig.rows*0.15);
    cv.resize(absDst, absDst, dsize, 0, 0, cv.INTER_AREA);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(absDst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    const largestIndex = getLargestContourIndex(contours);
    //let cnt = contours.get(largestIndex);

    //let rotatedRect = cv.minAreaRect(cnt);
    //let vertices = cv.RotatedRect.points(rotatedRect);
    let contoursColor = new cv.Scalar(255, 255, 255, 255);
    //let rectangleColor = new cv.Scalar(255, 0, 0);

    cv.drawContours(orig, contours, largestIndex, contoursColor, -1, 8, hierarchy, 0, {x: 0, y: orig.rows*0.85});

    absDstx.delete();
    absDsty.delete();
    absDst.delete();
    contours.delete();
    hierarchy.delete();
    dst.delete();

    return orig;
  } catch(error) {
    console.error('Error in barcode extraction', error);
    return;
  }
}

export function rotate(src, rotate) {
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

export function crop(src) {
  let M, s, dsize, anchor, ksize;
  let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  let absDst = new cv.Mat();
  let absDstx = new cv.Mat();
  let absDsty = new cv.Mat();

  dsize = new cv.Size(800, src.rows/src.cols*800);
  cv.resize(src, dst, dsize, 0, 0, cv.INTER_AREA);
  
  s = new cv.Scalar(0, 0, 0);
  cv.copyMakeBorder(dst, dst, 200, 200, 200, 200, cv.BORDER_CONSTANT, s);

  cv.Sobel(dst, absDstx, cv.CV_64F, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
  cv.Sobel(dst, absDsty, cv.CV_64F, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);

  cv.subtract(absDstx, absDsty, absDst);
  cv.convertScaleAbs(absDst, absDst, 1, 0);
  ksize = new cv.Size(37,37);
  cv.GaussianBlur(absDst, absDst, ksize, 0, 0, cv.BORDER_DEFAULT);
  cv.threshold(absDst, absDst, 80, 255, cv.THRESH_BINARY);

  M = new cv.Mat();
  ksize = new cv.Size(117,117);
  M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
  cv.morphologyEx(absDst, absDst, cv.MORPH_CLOSE, M);

  M = cv.Mat.ones(17,17, cv.CV_8U);
  anchor = new cv.Point(-1, -1);
  cv.erode(absDst, absDst, M, anchor,6);
  cv.dilate(absDst, absDst, M, anchor,9);

  const rotatedRect = getRotatedRectForLargestContour(absDst);
  let cropped = cropMinAreaRect(src, rotatedRect, src.cols/(dst.cols-400), -200, -200);
  M.delete(); dst.delete();
  absDstx.delete(); absDsty.delete(); absDst.delete();

  return cropped;
}

export function getLargestContourIndex(contours) {
  let maxArea = 0;
  let cnt;
  let largestIndex;
  for (let i = 0; i < contours.size(); ++i) {
    let area = cv.contourArea(contours.get(i), false);
    console.log(area);
    if (area > maxArea) {
      cnt = contours.get(i);
      largestIndex = i;
      maxArea = area;
    }
  }
  return largestIndex;
}

export function getRotatedRectForLargestContour(src) {
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
  const largestIndex = getLargestContourIndex(contours);
  const cnt = contours.get(largestIndex);
  let rotatedRect = cv.minAreaRect(cnt);
  /*let vertices = cv.RotatedRect.points(rotatedRect);
  let contoursColor = new cv.Scalar(255, 255, 255);
  let rectangleColor = new cv.Scalar(255, 0, 0);
  cv.drawContours(src, contours, 0, contoursColor, 1, 8, hierarchy, 100);
  // draw rotatedRect
  for (let i = 0; i < 4; i++) {
      cv.line(src, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
  }*/
  contours.delete();
  hierarchy.delete();
  cnt.delete();
  return rotatedRect;
}

export function cropMinAreaRect(src, rotatedRect, scale, offsetX, offsetY) {
  // inspired by https://jdhao.github.io/2019/02/23/crop_rotated_rectangle_opencv/

  const vertices = cv.RotatedRect.points(rotatedRect);

  /*const bl = vertices[0];
  const tl = vertices[1];
  const tr = vertices[2];
  const br = vertices[3];*/

  //Sort by Y position (to get top-down)
  vertices.sort((a, b) => a.y < b.y ? -1 : (a.y > b.y ? 1 : 0)).slice(0, 5);

  //Determine left/right based on x position of top and bottom 2
  let tl = vertices[0].x < vertices[1].x ? vertices[0] : vertices[1];
  let tr = vertices[0].x > vertices[1].x ? vertices[0] : vertices[1];
  let bl = vertices[2].x < vertices[3].x ? vertices[2] : vertices[3];
  let br = vertices[2].x > vertices[3].x ? vertices[2] : vertices[3];

  tl.x = (tl.x+offsetX)*scale;
  tl.y = (tl.y+offsetY)*scale;
  tr.x = (tr.x+offsetX)*scale;
  tr.y = (tr.y+offsetY)*scale;
  bl.x = (bl.x+offsetX)*scale;
  bl.y = (bl.y+offsetY)*scale;
  br.x = (br.x+offsetX)*scale;
  br.y = (br.y+offsetY)*scale;

  const height = Math.hypot(bl.x-tl.x, bl.y-tl.y);
  const width = Math.hypot(tl.x-tr.x, tl.y-tr.y);
  const dst_coords = cv.matFromArray(4, 1,cv.CV_32FC2, [0, 0, width-1, 0, width-1, height-1, 0, height-1]);
  const src_coords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);

  console.log(tl, tr, bl, br, 'width', width, 'height', height, 'rotatedRect', rotatedRect, 'vertices', vertices);

  const M = cv.getPerspectiveTransform(src_coords, dst_coords);

  const dsize = new cv.Size(width, height);
  let warped = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  cv.warpPerspective(src, warped, M, dsize);

  M.delete();
  dst_coords.delete();
  src_coords.delete();

  return warped;
}