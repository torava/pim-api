let presets = {
somestuff: {
blur: 9,
threshold_area: 99,
threshold: 15,
post_threshold_erode_dilate: 25,
canny: 3,
close: 50,
post_canny_erode_dilate: 5
},
morestuff: {
blur: 3,
threshold_area: 99,
threshold: -7,
post_threshold_erode_dilate: 1,
close: 30,
post_canny_erode_dilate: 5
},
clean: {
blur: 0,
threshold_area: 99,
threshold: -5,
post_threshold_erode_dilate: 0,
close: 60,
post_canny_erode_dilate: 15
},
messy: {
blur: 0,
threshold_area: 999,
threshold: -30,
post_threshold_erode_dilate: 15,
post_canny_erode_dilate: 25
}
};

let preset = presets.somestuff;

let src = cv.imread('canvasInput');
let eq = new cv.Mat();
let bl = new cv.Mat();
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.equalizeHist(src, eq);

cv.bilateralFilter(eq, bl,3,75,75);

if (preset.blur) cv.medianBlur(bl, bl, preset.blur);


//cv.threshold(bl, dst, 10, 255, cv.THRESH_BINARY_INV);

cv.adaptiveThreshold(bl, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, preset.threshold_area, preset.threshold);

eq.delete();
bl.delete();

if (preset.post_threshold_erode_dilate) {
M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, preset.post_threshold_erode_dilate);
    cv.dilate(dst, dst, M, anchor, preset.post_threshold_erode_dilate);
}

if (preset.canny) cv.Canny(dst, dst, 0, 1, preset.canny, false);

if (preset.close) {
M = new cv.Mat();
    ksize = new cv.Size(preset.close, preset.close);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);
}

if (preset.post_canny_erode_dilate) {
M= cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, preset.post_canny_erode_dilate);
    cv.dilate(dst, dst, M, anchor, preset.post_canny_erode_dilate);
}

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

cropped = rotateImage(cropped, rotatedRect.angle);


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

function rotateImage(src, rotate) {

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
rotate = 45;
let rotw = Math.abs(src.cols*Math.sin((90-rotate)*Math.PI/180))+Math.abs(src.rows*Math.sin(rotate*Math.PI/180));
let roth = Math.abs(src.rows*Math.sin((90-rotate)*Math.PI/180))+Math.abs(src.cols*Math.sin(rotate*Math.PI/180));
let s = new cv.Scalar(0, 0, 0, 255);
let size = new cv.Size(src.cols, src.rows);

        let dst = new cv.Mat(size, src.type());

console.log(src.cols, src.rows, rotw, roth, rotw-src.cols, roth-src.rows);
src.copyTo(dst);
cv.copyMakeBorder(dst, dst, Math.max(roth-src.rows,0), 0, Math.max(rotw-src.cols), 0, cv.BORDER_CONSTANT, s);
    console.log(src.cols, src.rows);
        // get rotation matrix for rotating the image around its center in pixel coordinates
        let center = new cv.Point((dst.cols-1)/2.0, (dst.rows-1)/2.0);
        let rot = cv.getRotationMatrix2D(center, rotate, 1.0);
        // determine bounding rectangle, center not relevant
        let bbox = new cv.RotatedRect(new cv.Point(), dst.size(), rotate);

        console.log(src, bbox);
        // adjust transformation matrix
        //rot.data[3]+= bbox.size.width/2.0 - src.cols/2.0;
        //rot.data[9]+= bbox.size.height/2.0 - src.rows/2.0;
        //rot.at<double>(0,2) += bbox.width/2.0 - src.cols/2.0;
        //rot.at<double>(1,2) += bbox.height/2.0 - src.rows/2.0;

        

        cv.warpAffine(dst, dst, rot, size);
return dst;
    }
    return dst;
    }