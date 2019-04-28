/* new stuff preset */

let presets = {
stuff: {
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
post_threshold_erode_dilate: 1,
close: 40,
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

let preset = presets.stuff;


let src = cv.imread('canvasInput');
let dst = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
cv.equalizeHist(src, dst);

cv.bilateralFilter(src,dst,3,75,75);

if (preset.blur) cv.medianBlur(dst, dst, preset.blur);

cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, preset.threshold_area, preset.threshold);

M = cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, preset.post_threshold_erode_dilate);
    cv.dilate(dst, dst, M, anchor, preset.post_threshold_erode_dilate);

cv.Canny(dst, dst, 0, 1, 3, false);

M = new cv.Mat();
    ksize = new cv.Size(preset.close, preset.close);
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

cv.imshow('canvasOutput', dst);


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