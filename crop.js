// crop

let src = cv.imread('canvasInput', cv.IMREAD_IGNORE_ORIENTATION);
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);

let dsize = new cv.Size(800, src.rows/src.cols*800);
cv.resize(src, src, dsize, 0, 0, cv.INTER_AREA);

/*let ksize = new cv.Size(60, 60);
let anchor = new cv.Point(-1, -1);
//cv.blur(src, dst, ksize, anchor, cv.BORDER_DEFAULT);
cv.boxFilter(src, dst, -1, ksize, anchor, true, cv.BORDER_DEFAULT);*/

let ksize = new cv.Size(59,59);
cv.GaussianBlur(src, dst, ksize, 0, 0, cv.BORDER_DEFAULT);

//cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 5);

cv.Canny(dst, dst, 1, 300, 5, false);

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

console.log(dst.rows,dst.cols,boundaries);

let rect = new cv.Rect(
Math.max(boundaries.left-15,0),
Math.max(boundaries.top-15,0),
Math.min(boundaries.right-boundaries.left+30,dst.cols-boundaries.left),
Math.min(boundaries.bottom-boundaries.top+30,dst.rows-boundaries.top)
);

dst = src.roi(rect);

// threshold

cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 71, 15);

let M2 = cv.Mat.ones(1, 1, cv.CV_8S);
let anchor2 = new cv.Point(1, 1);

//cv.dilate(dst, dst, M2, anchor2, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
//cv.erode(dst, dst, M2, anchor2, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

cv.imshow('canvasOutput', dst);

src.delete(); dst.delete();

///////////////////////// contour

let src = cv.imread('canvasInput');
let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.Canny(src,src, 1, 3000, 5, false);

let M = new cv.Mat();
let ksize = new cv.Size(7, 7);
// You can try more different parameters
M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);

//cv.imshow('canvasOutput', src);
let contours = new cv.MatVector();
let hierarchy = new cv.Mat();
cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
let cnt = contours.get(0);
// You can try more different parameters
let rotatedRect = cv.minAreaRect(cnt);
let vertices = cv.RotatedRect.points(rotatedRect);
let contoursColor = new cv.Scalar(255, 255, 255);
let rectangleColor = new cv.Scalar(255, 0, 0);
cv.drawContours(dst, contours, 0, contoursColor, 1, 8, hierarchy, 1);
// draw rotatedRect
for (let i = 0; i < 4; i++) {
    cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
}
cv.imshow('canvasOutput', dst);
src.delete(); dst.delete(); contours.delete(); hierarchy.delete(); cnt.delete();

///////////////////////// contour v2

let src = cv.imread('canvasInput');
let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

let ksize = new cv.Size(25,25);
cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

cv.imshow('canvasOutput', src);

cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 101, 11);
cv.Canny(src,src, 3000, 195, 5, false);

cv.imshow('canvasOutput', src);

let M = new cv.Mat();
ksize = new cv.Size(200, 200);
// You can try more different parameters
M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);

cv.imshow('canvasOutput', src);

let contours = new cv.MatVector();
let hierarchy = new cv.Mat();
cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
let cnt = contours.get(0);
// You can try more different parameters
let rotatedRect = cv.minAreaRect(cnt);
let vertices = cv.RotatedRect.points(rotatedRect);
let contoursColor = new cv.Scalar(255, 255, 255);
let rectangleColor = new cv.Scalar(255, 0, 0);
cv.drawContours(dst, contours, 0, contoursColor, 1, 8, hierarchy, 100);
// draw rotatedRect
for (let i = 0; i < 4; i++) {
    cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
}
cv.imshow('canvasOutput', dst);
src.delete(); dst.delete(); contours.delete(); hierarchy.delete(); cnt.delete();

// contour v3

let src = cv.imread('canvasInput');
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

let dsize = new cv.Size(1000, src.rows/src.cols*1000);
cv.resize(src, src, dsize, 0, 0, cv.INTER_AREA);

let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

let ksize = new cv.Size(25,25);
//cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 35);
cv.Canny(src,src, 1, 0, 5, false);

cv.imshow('canvasOutput', src);

let M = new cv.Mat();
ksize = new cv.Size(100, 100);
// You can try more different parameters
M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);

let contours = new cv.MatVector();
let hierarchy = new cv.Mat();
cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
let cnt = contours.get(0);
// You can try more different parameters
let rotatedRect = cv.minAreaRect(cnt);
let vertices = cv.RotatedRect.points(rotatedRect);
let contoursColor = new cv.Scalar(255, 255, 255);
let rectangleColor = new cv.Scalar(255, 0, 0);
cv.drawContours(dst, contours, 0, contoursColor, 1, 8, hierarchy, 100);
// draw rotatedRect
for (let i = 0; i < 4; i++) {
    cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
}
cv.imshow('canvasOutput', dst);
src.delete(); dst.delete(); contours.delete(); hierarchy.delete(); cnt.delete();

// contour v4 with erode

let src = cv.imread('canvasInput');
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

let dsize = new cv.Size(1000, src.rows/src.cols*1000);
cv.resize(src, src, dsize, 0, 0, cv.INTER_AREA);

let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

let ksize = new cv.Size(9,9);
cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 19, 21);
/*
M = cv.Mat.ones(2, 2, cv.CV_8U);
let anchor = new cv.Point(-1, -1);
cv.dilate(src, src, M, anchor, 2);
cv.erode(src, src, M, anchor);
*/
cv.Canny(src,src, 1, 0, 5, false);

cv.imshow('canvasOutput', src);

M = new cv.Mat();
ksize = new cv.Size(100, 100);
// You can try more different parameters
M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);

M = cv.Mat.ones(5, 5, cv.CV_8U);
let anchor = new cv.Point(-1, -1);
cv.erode(src, src, M, anchor);

let contours = new cv.MatVector();
let hierarchy = new cv.Mat();
cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

let cnt = contours.get(contours.size()-1);

// You can try more different parameters
let rotatedRect = cv.minAreaRect(cnt);
let vertices = cv.RotatedRect.points(rotatedRect);
let contoursColor = new cv.Scalar(255, 255, 255);
let rectangleColor = new cv.Scalar(255, 0, 0);
cv.drawContours(dst, contours, -1, contoursColor, 1, 8, hierarchy, 100);
// draw rotatedRect
for (let i = 0; i < 4; i++) {
    cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
}

cv.imshow('canvasOutput', dst);
src.delete(); dst.delete(); contours.delete(); hierarchy.delete(); cnt.delete();

// contour v5 with iterating
let src = cv.imread('canvasInput');
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

let dsize = new cv.Size(1000, src.rows/src.cols*1000);
cv.resize(src, src, dsize, 0, 0, cv.INTER_AREA);

let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

let ksize = new cv.Size(1,1);
cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 19, 21);

M = cv.Mat.ones(2, 2, cv.CV_8U);
let anchor = new cv.Point(-1, -1);
cv.dilate(src, src, M, anchor, 1);
cv.erode(src, src, M, anchor);

cv.Canny(src,src, 1, 0, 5, false);


//cv.imshow('canvasOutput', src);/*

M = new cv.Mat();
ksize = new cv.Size(100, 100);
// You can try more different parameters
M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);

M = cv.Mat.ones(5, 5, cv.CV_8U);
anchor = new cv.Point(-1, -1);
cv.erode(src, src, M, anchor);

let contours = new cv.MatVector();
let hierarchy = new cv.Mat();
cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

let cnt, current, area, biggest = 0;

for (let n = 0; n < contours.size(); n++) {

current = contours.get(n);
area = cv.contourArea(current, false);
if (area > biggest) {

biggest = area;
cnt = current;

}

}


// You can try more different parameters
let rotatedRect = cv.minAreaRect(cnt);
let vertices = cv.RotatedRect.points(rotatedRect);
let contoursColor = new cv.Scalar(255, 255, 255);
let rectangleColor = new cv.Scalar(255, 0, 0);
cv.drawContours(dst, contours, -1, contoursColor, 1, 8, hierarchy, 100);
// draw rotatedRect
for (let i = 0; i < 4; i++) {
    cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
}

cv.imshow('canvasOutput', dst);
src.delete(); dst.delete(); contours.delete(); hierarchy.delete(); cnt.delete();



//////////// CROP 220219

let orig = cv.imread('canvasInput');
let src = new cv.Mat();

cv.cvtColor(orig,orig, cv.COLOR_RGB2GRAY, 0);

/*cv.transpose(orig,orig);  
      cv.flip(orig,orig, true);
*/

 dsize = new cv.Size(800, orig.rows/orig.cols*800);
    cv.resize(orig, src, dsize, 0, 0, cv.INTER_AREA);


let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

let ksize = new cv.Size(5,5);
cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY,9,11);

cv.Canny(src, src, 20, 60, 3, false);


 M = new cv.Mat();
    ksize = new cv.Size(80, 80);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);
  
    M = cv.Mat.ones(10,10, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(src, src, M, anchor,3);
 
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(dst, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);


let scale = orig.cols/src.cols;
    rect = new cv.Rect(Math.max(rect.x, 0)*scale, Math.max(rect.y, 0)*scale, Math.min(rect.width, src.cols)*scale, Math.min(rect.height, src.rows)*scale);
  
let crop = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
let out = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);

    crop = orig.roi(rect);

dsize = new cv.Size(800, crop.rows/crop.cols*800);
    cv.resize(crop,crop, dsize, 0, 0, cv.INTER_AREA);

    // threshold
  
ksize = new cv.Size(5,5);
//cv.GaussianBlur(out, out, ksize, 0, 0, cv.BORDER_DEFAULT);
cv.bilateralFilter(crop,out,5,75,75);

// 201,5
    cv.adaptiveThreshold(out, out, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15,5);

ksize = new cv.Size(2,2);
    anchor = new cv.Point(1,1);
    let anchor2 = new cv.Point(-1,-1);
    M = cv.getStructuringElement(cv.MORPH_ELLIPSE, ksize, anchor);
    cv.dilate(out, out, M, anchor2);
    cv.erode(out, out, M, anchor2,2);

let rotate = rotatedRect.angle/2;

// get rotation matrix for rotating the image around its center in pixel coordinates
      let center = new cv.Point((out.cols-1)/2.0, (out.rows-1)/2.0);
      let rot = cv.getRotationMatrix2D(center, rotate, 1.0);
      // determine bounding rectangle, center not relevant
      let bbox = new cv.RotatedRect(new cv.Point(), out.size(), rotate);
      console.log(bbox);
      // adjust transformation matrix
      rot.data[0+out.rows*2]+= bbox.size.width/2.0 - out.cols/2.0;
      rot.data[1+src.rows*2]+= bbox.size.height/2.0 - out.rows/2.0;
      //rot.at<double>(0,2) += bbox.width/2.0 - out.cols/2.0;
      //rot.at<double>(1,2) += bbox.height/2.0 - out.rows/2.0;

      cv.warpAffine(out, out, rot, new cv.Size(bbox.size.width, bbox.size.height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255));

cv.imshow('canvasOutput', out);
src.delete(); dst.delete();

// business card 220219

let orig = cv.imread('canvasInput');
let src = new cv.Mat();

cv.cvtColor(orig,orig, cv.COLOR_RGB2GRAY, 0);

/*cv.transpose(orig,orig);  
      cv.flip(orig,orig, true);
*/

 dsize = new cv.Size(800, orig.rows/orig.cols*800);
    cv.resize(orig, src, dsize, 0, 0, cv.INTER_AREA);


let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

let ksize = new cv.Size(3,3);
//cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY,9,11);

cv.Canny(src, src, 20, 60, 3, false);


 M = new cv.Mat();
    ksize = new cv.Size(80, 80);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);
 
    M = cv.Mat.ones(10,10, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(src, src, M, anchor,3);
cv.dilate(src, src, M, anchor,3);
 
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(dst, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);


let scale = orig.cols/src.cols;
    rect = new cv.Rect(Math.max(rect.x, 0)*scale, Math.max(rect.y, 0)*scale, Math.min(rect.width, src.cols)*scale, Math.min(rect.height, src.rows)*scale);
  
let crop = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
let out = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);

    crop = orig.roi(rect);

dsize = new cv.Size(1600, crop.rows/crop.cols*1600);
    cv.resize(crop,crop, dsize, 0, 0, cv.INTER_AREA);

    // threshold
  
ksize = new cv.Size(5,5);
//cv.GaussianBlur(out, out, ksize, 0, 0, cv.BORDER_DEFAULT);
cv.bilateralFilter(crop,out,5,75,75);

// 201,5
    cv.adaptiveThreshold(out, out, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15,5);

ksize = new cv.Size(2,2);
    anchor = new cv.Point(1,1);
    let anchor2 = new cv.Point(-1,-1);
    M = cv.getStructuringElement(cv.MORPH_ELLIPSE, ksize, anchor);
    cv.dilate(out, out, M, anchor2);
    cv.erode(out, out, M, anchor2,2);

let rotate = rotatedRect.angle/2;

// get rotation matrix for rotating the image around its center in pixel coordinates
      let center = new cv.Point((out.cols-1)/2.0, (out.rows-1)/2.0);
      let rot = cv.getRotationMatrix2D(center, rotate, 1.0);
      // determine bounding rectangle, center not relevant
      let bbox = new cv.RotatedRect(new cv.Point(), out.size(), rotate);
      console.log(bbox);
      // adjust transformation matrix
      rot.data[0+out.rows*2]+= bbox.size.width/2.0 - out.cols/2.0;
      rot.data[1+src.rows*2]+= bbox.size.height/2.0 - out.rows/2.0;
      //rot.at<double>(0,2) += bbox.width/2.0 - out.cols/2.0;
      //rot.at<double>(1,2) += bbox.height/2.0 - out.rows/2.0;

      cv.warpAffine(out, out, rot, new cv.Size(bbox.size.width, bbox.size.height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255));

cv.imshow('canvasOutput', out);
src.delete(); dst.delete();

// receipt 220219

let orig = cv.imread('canvasInput');
let src = new cv.Mat();

cv.cvtColor(orig,orig, cv.COLOR_RGB2GRAY, 0);
/*
cv.transpose(orig,orig);  
    cv.flip(orig,orig, true);
*/

 dsize = new cv.Size(1000, orig.rows/orig.cols*1000);
    cv.resize(orig, src, dsize, 0, 0, cv.INTER_AREA);


let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

let ksize = new cv.Size(3,3);
cv.GaussianBlur(src, src, ksize, 0, 0, cv.BORDER_DEFAULT);

cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY,59,51);

cv.Canny(src, src, 20, 60, 3, false);


 M = new cv.Mat();
    ksize = new cv.Size(80, 80);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(src, src, cv.MORPH_CLOSE, M);
 
    M = cv.Mat.ones(10,10, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(src, src, M, anchor,3);
cv.dilate(src, src, M, anchor,6);
 
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(dst, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);


let scale = orig.cols/src.cols;
    rect = new cv.Rect(Math.max(rect.x, 0)*scale, Math.max(rect.y, 0)*scale, Math.min(rect.width, src.cols)*scale, Math.min(rect.height, src.rows)*scale);
  
let crop = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
let out = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);

    crop = orig.roi(rect);

dsize = new cv.Size(1200, crop.rows/crop.cols*1200);
    cv.resize(crop,crop, dsize, 0, 0, cv.INTER_AREA);

    // threshold
  
ksize = new cv.Size(5,5);
//cv.GaussianBlur(out, out, ksize, 0, 0, cv.BORDER_DEFAULT);
cv.bilateralFilter(crop,out,5,75,75);

// 201,5
    cv.adaptiveThreshold(out, out, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15,5);

ksize = new cv.Size(2,2);
    anchor = new cv.Point(1,1);
    let anchor2 = new cv.Point(-1,-1);
    M = cv.getStructuringElement(cv.MORPH_ELLIPSE, ksize, anchor);
    cv.dilate(out, out, M, anchor2);
    cv.erode(out, out, M, anchor2,2);

//let rotate = rotatedRect.angle+90;
let rotate = 0;

// get rotation matrix for rotating the image around its center in pixel coordinates
      let center = new cv.Point((out.cols-1)/2.0, (out.rows-1)/2.0);
      let rot = cv.getRotationMatrix2D(center, rotate, 1.0);
      // determine bounding rectangle, center not relevant
      let bbox = new cv.RotatedRect(new cv.Point(), out.size(), rotate);
      console.log(bbox);
      // adjust transformation matrix
      rot.data[0+out.rows*2]+= bbox.size.width/2.0 - out.cols/2.0;
      rot.data[1+src.rows*2]+= bbox.size.height/2.0 - out.rows/2.0;
      //rot.at<double>(0,2) += bbox.width/2.0 - out.cols/2.0;
      //rot.at<double>(1,2) += bbox.height/2.0 - out.rows/2.0;

      cv.warpAffine(out, out, rot, new cv.Size(bbox.size.width, bbox.size.height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255));

cv.imshow('canvasOutput', out);
src.delete(); dst.delete();



// 190421 negative threshold ftw

let src = cv.imread('canvasInput');
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.equalizeHist(src, src);

cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 999, -10);
/*
M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 15);
    cv.dilate(dst, dst, M, anchor, 15);

cv.Canny(dst, dst, 1, 0, 5, false);

M = new cv.Mat();
    ksize = new cv.Size(90, 90);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);

M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 5);
    cv.dilate(dst, dst, M, anchor, 5);
*/
let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    let prev = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(prev, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(prev, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

cv.imshow('canvasOutput', prev);
src.delete();
dst.delete();








find_squares(image, squares) {
    // blur will enhance edge detection
    let blurred = new cv.Mat();
    cv.medianBlur(image, blurred, 9);

    let gray = new cv.Mat();
    cv.cvtColor(blurred, gray, cv.COLOR_RGB2GRAY, 0);

    let edited = new cv.Mat();

    let contours;
/*
    // find squares in every color plane of the image
    for (let c = 0; c < 3; c++) {
        int ch[] = {c, 0};
        mixChannels(&blurred, 1, &gray0, 1, ch, 1);
*/
        // try several threshold levels
        let threshold_level = 2;
        for (let l = 0; l < threshold_level; l++)
        {
            // Use Canny instead of zero threshold level!
            // Canny helps to catch squares with gradient shading
            if (l == 0)
            {
                Canny(gray, edited, 10, 20, 3); // 

                // Dilate helps to remove potential holes between edge segments
                dilate(edited, edited, Mat(), Point(-1,-1));
            }
            else
            {
                    edited = gray >= (l+1) * 255 / threshold_level;
            }

            // Find contours and store them in a list
            findContours(gray, contours, CV_RETR_LIST, CV_CHAIN_APPROX_SIMPLE);

            // Test contours
            vector<Point> approx;
            for (size_t i = 0; i < contours.size(); i++)
            {
                    // approximate contour with accuracy proportional
                    // to the contour perimeter
                    approxPolyDP(Mat(contours[i]), approx, arcLength(Mat(contours[i]), true)*0.02, true);

                    // Note: absolute value of an area is used because
                    // area may be positive or negative - in accordance with the
                    // contour orientation
                    if (approx.size() == 4 &&
                            fabs(contourArea(Mat(approx))) > 1000 &&
                            isContourConvex(Mat(approx)))
                    {
                            double maxCosine = 0;

                            for (int j = 2; j < 5; j++)
                            {
                                    double cosine = fabs(angle(approx[j%4], approx[j-2], approx[j-1]));
                                    maxCosine = MAX(maxCosine, cosine);
                            }

                            if (maxCosine < 0.3)
                                    squares.push_back(approx);
                    }
            }
        }
    }
}




// 180425 introducing: median

let src = cv.imread('canvasInput');
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.equalizeHist(src, src);
cv.medianBlur(src, src, 3);

//cv.threshold(src, dst, 200, 255, cv.THRESH_TOZERO);
cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 499, -30);

M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 5);
    cv.dilate(dst, dst, M, anchor, 5);

cv.Canny(dst, dst, 355, 356, 3, false);

M = new cv.Mat();
    ksize = new cv.Size(50, 50);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);

M= cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 15);
    cv.dilate(dst, dst, M, anchor, 15);

let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    let prev = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(prev, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(prev, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

cv.imshow('canvasOutput', dst);
src.delete();
dst.delete();



/* for clean background */

let src = cv.imread('canvasInput');
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.equalizeHist(src, src);
cv.medianBlur(src, src, 3);

//cv.threshold(src, dst, 200, 255, cv.THRESH_TOZERO);
cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 499, 30);

M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 5);
    cv.dilate(dst, dst, M, anchor, 5);

cv.Canny(dst, dst, 355, 356, 3, false);

M = new cv.Mat();
    ksize = new cv.Size(70, 70);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);

M= cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 15);
    cv.dilate(dst, dst, M, anchor, 15);

let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    let prev = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(prev, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(prev, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

cv.imshow('canvasOutput', dst);
src.delete();
dst.delete();



/* for messy background */

let src = cv.imread('canvasInput');
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.equalizeHist(src, src);
cv.medianBlur(src, src, 3);

//cv.threshold(src, dst, 200, 255, cv.THRESH_TOZERO);
cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 499, -60);
/*
M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 5);
    cv.dilate(dst, dst, M, anchor, 5);

cv.Canny(dst, dst, 355, 356, 3, false);

M = new cv.Mat();
    ksize = new cv.Size(70, 70);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);

M= cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 15);
    cv.dilate(dst, dst, M, anchor, 15);
*/
let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    let prev = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(prev, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(prev, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

cv.imshow('canvasOutput', dst);
src.delete();
dst.delete();



/* messy w histogram */

let src = cv.imread('canvasInput');
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.equalizeHist(src, src);

cv.medianBlur(src, dst, 3);

cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 499, -60);

M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 5);
    cv.dilate(dst, dst, M, anchor, 5);

cv.Canny(dst, dst, 0, 1, 7, true);

M = new cv.Mat();
    ksize = new cv.Size(70, 70);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);

M= cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 25);
    cv.dilate(dst, dst, M, anchor, 25);

let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    let prev = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(prev, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(prev, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

scale = 1;
    rect = new cv.Rect(Math.max(rect.x-10, 0)*scale, Math.max(rect.y-10, 0)*scale, Math.min(rect.width+10, src.cols)*scale, Math.min(rect.height+10, src.rows)*scale);
  
let cropped = src.roi(rect);

cv.imshow('canvasOutput', cropped);


let srcVec = new cv.MatVector();
srcVec.push_back(cropped);
let accumulate = false;
let channels = [0];
let histSize = [256];
let ranges = [0, 255];
let hist = new cv.Mat();
let mask = new cv.Mat();
let color = new cv.Scalar(255, 255, 255);
scale = 2;
// You can try more different parameters
cv.calcHist(srcVec, channels, mask, hist, histSize, ranges, accumulate);
let result = cv.minMaxLoc(hist, mask);
let max = result.maxVal;

let lowVal = 0, highVal = 0;

// draw histogram
for (let i = 0; i < histSize[0]/2; i++) {
    lowVal+= hist.data32F[i] * src.rows / max;
}
// draw histogram
for (let i = histSize[0]/2; i < histSize[0]; i++) {
    highVal+= hist.data32F[i] * src.rows / max;
}

console.log(lowVal, highVal);

src.delete();
dst.delete();


/* clean w histogram */


let src = cv.imread('canvasInput');
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.equalizeHist(src, dst);

cv.medianBlur(dst, dst, 3);

cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 499, 20);

M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 15);
    cv.dilate(dst, dst, M, anchor, 15);

cv.Canny(dst, dst, 0, 1, 3, false);

M = new cv.Mat();
    ksize = new cv.Size(70, 70);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);

M= cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, 25);
    cv.dilate(dst, dst, M, anchor, 25);

let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let cnt, current, area, biggest = 0;
  
    for (let n = 0; n < contours.size(); n++) {
      current = contours.get(n);
      area = cv.contourArea(current, false);
      if (area > biggest) {
        biggest = area;
        cnt = current;
      }
    }

    let prev = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

    let contoursColor = new cv.Scalar(255, 255, 255);

    cv.drawContours(prev, contours, -1, contoursColor, 1, 8, hierarchy, 100);

    let rotatedRect = cv.minAreaRect(cnt);
    let vertices = cv.RotatedRect.points(rotatedRect);
    let rectangleColor = new cv.Scalar(0, 255, 0);
    // draw rotatedRect
    for (let i = 0; i < 4; i++) {
        cv.line(prev, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
    }

    let rect = cv.boundingRect(cnt);
    rectangleColor = new cv.Scalar(255, 0, 0);

    console.log(rotatedRect, vertices);
  
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

scale = 1;
    rect = new cv.Rect(Math.max(rect.x-0, 0)*scale, Math.max(rect.y-0, 0)*scale, Math.min(rect.width+0, src.cols)*scale, Math.min(rect.height+0, src.rows)*scale);
  
let cropped = src.roi(rect);

cv.imshow('canvasOutput', cropped);


let srcVec = new cv.MatVector();
srcVec.push_back(cropped);
let accumulate = false;
let channels = [0];
let histSize = [256];
let ranges = [0, 255];
let hist = new cv.Mat();
let mask = new cv.Mat();
let color = new cv.Scalar(255, 255, 255);
scale = 2;
// You can try more different parameters
cv.calcHist(srcVec, channels, mask, hist, histSize, ranges, accumulate);
let result = cv.minMaxLoc(hist, mask);
let max = result.maxVal;

let lowVal = 0, highVal = 0;

// draw histogram
for (let i = 0; i < histSize[0]/2; i++) {
    lowVal+= hist.data32F[i] * src.rows / max;
}
// draw histogram
for (let i = histSize[0]/2; i < histSize[0]; i++) {
    highVal+= hist.data32F[i] * src.rows / max;
}

console.log(lowVal, highVal, lowVal/(cropped.cols*cropped.rows), highVal/(cropped.cols*cropped.rows), cropped.cols*cropped.rows);

src.delete();
dst.delete();


/* presets */

let presets = {
    clean: {
    blur: 0,
    threshold_area: 499,
    threshold: 20,
    post_threshold_erode_dilate: 15,
    post_canny_erode_dilate: 25
    },
    messy: {
    blur: 0,
    threshold_area: 999,
    threshold: -30,
    post_threshold_erode_dilate: 15,
    post_canny_erode_dilate: 25
    }
    };
    
    let preset = presets.clean;
    
    
    let src = cv.imread('canvasInput');
    let dst = new cv.Mat();
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.equalizeHist(src, dst);
    
    if (preset.blur) cv.medianBlur(dst, dst, preset.blur);
    
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, preset.threshold_area, preset.threshold);
    
    M = cv.Mat.ones(2, 2, cv.CV_8U);
        anchor = new cv.Point(-1, -1);
        cv.erode(dst, dst, M, anchor, preset.post_threshold_erode_dilate);
        cv.dilate(dst, dst, M, anchor, preset.post_threshold_erode_dilate);
    
    cv.Canny(dst, dst, 0, 1, 3, false);
    
    M = new cv.Mat();
        ksize = new cv.Size(70, 70);
        M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
        cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);
    
    M= cv.Mat.ones(2, 2, cv.CV_8U);
        anchor = new cv.Point(-1, -1);
        cv.erode(dst, dst, M, anchor, preset.post_canny_erode_dilate);
        cv.dilate(dst, dst, M, anchor, preset.post_canny_erode_dilate);
    
    let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    
        let cnt, current, area, biggest = 0;
      
        for (let n = 0; n < contours.size(); n++) {
          current = contours.get(n);
          area = cv.contourArea(current, false);
          if (area > biggest) {
            biggest = area;
            cnt = current;
          }
        }
    
        let prev = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    
        let contoursColor = new cv.Scalar(255, 255, 255);
    
        cv.drawContours(prev, contours, -1, contoursColor, 1, 8, hierarchy, 100);
    
        let rotatedRect = cv.minAreaRect(cnt);
        let vertices = cv.RotatedRect.points(rotatedRect);
        let rectangleColor = new cv.Scalar(0, 255, 0);
        // draw rotatedRect
        for (let i = 0; i < 4; i++) {
            cv.line(prev, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
        }
    
        let rect = cv.boundingRect(cnt);
        rectangleColor = new cv.Scalar(255, 0, 0);
    
        console.log(rotatedRect, vertices);
      
        let point1 = new cv.Point(rect.x, rect.y);
        let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
        cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);
    
    scale = 1;
        rect = new cv.Rect(Math.max(rect.x-0, 0)*scale, Math.max(rect.y-0, 0)*scale, Math.min(rect.width+0, src.cols)*scale, Math.min(rect.height+0, src.rows)*scale);
      
    let cropped = src.roi(rect);
    
    cv.imshow('canvasOutput', cropped);
    
    
    let srcVec = new cv.MatVector();
    srcVec.push_back(cropped);
    let accumulate = false;
    let channels = [0];
    let histSize = [256];
    let ranges = [0, 255];
    let hist = new cv.Mat();
    let mask = new cv.Mat();
    let color = new cv.Scalar(255, 255, 255);
    scale = 2;
    // You can try more different parameters
    cv.calcHist(srcVec, channels, mask, hist, histSize, ranges, accumulate);
    let result = cv.minMaxLoc(hist, mask);
    let max = result.maxVal;
    
    let lowVal = 0, highVal = 0;
    
    // draw histogram
    for (let i = 0; i < histSize[0]/2; i++) {
        lowVal+= hist.data32F[i] * src.rows / max;
    }
    // draw histogram
    for (let i = histSize[0]/2; i < histSize[0]; i++) {
        highVal+= hist.data32F[i] * src.rows / max;
    }
    
    console.log(lowVal, highVal, lowVal/(cropped.cols*cropped.rows), highVal/(cropped.cols*cropped.rows), cropped.cols*cropped.rows);
    
    src.delete();
    dst.delete();