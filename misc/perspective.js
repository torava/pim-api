// https://stackoverflow.com/questions/51528462/opencv-js-perspective-transform

let orig = cv.imread('canvasInput');
cv.cvtColor(orig, orig, cv.COLOR_RGBA2GRAY, 0);
let src = cv.Mat.zeros(orig.rows, orig.cols, cv.CV_8UC3);
cv.threshold(orig, src, 177, 200, cv.THRESH_BINARY);
//Find all contours
let contours = new cv.MatVector();
let hierarchy = new cv.Mat();
cv.findContours(src, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

//Get area for all contours so we can find the biggest
let sortableContours = [];
for (let i = 0; i < contours.size(); i++) {
  let cnt = contours.get(i);
  let area = cv.contourArea(cnt, false);
  let perim = cv.arcLength(cnt, false);

  sortableContours.push({ areaSize: area, perimiterSize: perim, contour: cnt });
}

//Sort 'em
sortableContours = sortableContours.sort((item1, item2) => { return (item1.areaSize > item2.areaSize) ? -1 : (item1.areaSize < item2.areaSize) ? 1 : 0; }).slice(0, 5);

//Ensure the top area contour has 4 corners (NOTE: This is not a perfect science and likely needs more attention)
let approx = new cv.Mat();
cv.approxPolyDP(sortableContours[0].contour, approx, .05 * sortableContours[0].perimiterSize, true);

console.log(approx);
if (approx.rows == 4) {
  console.log('Found a 4-corner approx');
  let foundContour = approx;

//Find the corners
//foundCountour has 2 channels (seemingly x/y), has a depth of 4, and a type of 12.  Seems to show it's a CV_32S "type", so the valid data is in data32S??
let corner1 = new cv.Point(foundContour.data32S[0], foundContour.data32S[1]);
let corner2 = new cv.Point(foundContour.data32S[2], foundContour.data32S[3]);
let corner3 = new cv.Point(foundContour.data32S[4], foundContour.data32S[5]);
let corner4 = new cv.Point(foundContour.data32S[6], foundContour.data32S[7]);

//Order the corners
let cornerArray = [{ corner: corner1 }, { corner: corner2 }, { corner: corner3 }, { corner: corner4 }];
//Sort by Y position (to get top-down)
cornerArray.sort((item1, item2) => item1.corner.y < item2.corner.y ? -1 : (item1.corner.y > item2.corner.y ? 1 : 0)).slice(0, 5);

//Determine left/right based on x position of top and bottom 2
let tl = cornerArray[0].corner.x < cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
let tr = cornerArray[0].corner.x > cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
let bl = cornerArray[2].corner.x < cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];
let br = cornerArray[2].corner.x > cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];

//Calculate the max width/height
let widthBottom = Math.hypot(br.corner.x - bl.corner.x, br.corner.y - bl.corner.y);
let widthTop = Math.hypot(tr.corner.x - tl.corner.x, tr.corner.y - tl.corner.y);
let theWidth = (widthBottom > widthTop) ? widthBottom : widthTop;
let heightRight = Math.hypot(tr.corner.x - br.corner.x, tr.corner.y - br.corner.y);
let heightLeft = Math.hypot(tl.corner.x - bl.corner.x, tr.corner.y - bl.corner.y);
let theHeight = (heightRight > heightLeft) ? heightRight : heightLeft;
console.log(cornerArray);
//Transform!
let finalDestCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, theWidth - 1, 0, theWidth - 1, theHeight - 1, 0, theHeight - 1]); //
let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.corner.x, tl.corner.y, tr.corner.x, tr.corner.y, br.corner.x, br.corner.y, bl.corner.x, bl.corner.y]);
let dsize = new cv.Size(theWidth, theHeight);
let M = cv.getPerspectiveTransform(srcCoords, finalDestCoords);
let finalDest = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
cv.warpPerspective(src, finalDest, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

cv.imshow('canvasOutput', finalDest);
}