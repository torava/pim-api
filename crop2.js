let orig = cv.imread('canvasInput');
cv.cvtColor(orig, orig, cv.COLOR_RGB2GRAY, 0);

let src = new cv.Mat();

cv.bilateralFilter(orig,src,5,75,75);

let ksize = new cv.Size(15, 15);
cv.GaussianBlur(src,src, ksize, 0, 0, cv.BORDER_DEFAULT);

let prev = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);

let dst = new cv.Mat();
let old_diff;
let best_diff;
let best_size;

let width = 0;
let height = 0;

let difference;

presets = [
{
first: 0,
range: 10,
close: 30,
erode: 60
}, // clean vignette touching
{
first: 0,
range: 100,
close: 100,
erode: 5
}, // clean
{
first: 100,
range: 50,
close: 50
}, // messy
{
first: 50,
range: 5,
close: 50,
erode: 40
}, // half messy vignette
{
first: 0,
range: 100,
close: 25,
erode: 5
} // half messy
];

for (let i in presets) {
let preset = presets[0];

let first = preset.first || 0;
let range = preset.range || 0;
let close = preset.close || 0;
let erode = preset.erode || 0;
/*
for (let first = 0; first < 600; first+= 10) {

//let first = 300;
let range = 1;
let close = 50;
let erode = 40;
*/
cv.Canny(src, dst, first, first+range, 3, false);

if (close) {
M = new cv.Mat();
    ksize = new cv.Size(close, close);
    M = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, M);
}
if (erode) {
M= cv.Mat.ones(2, 2, cv.CV_8U);
    anchor = new cv.Point(-1, -1);
    cv.erode(dst, dst, M, anchor, erode);
    cv.dilate(dst, dst, M, anchor, erode);
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
    
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(dst, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

scale = 1;
let margin = 10,
x = Math.max(rect.x-margin-erode, 0)*scale,
y = Math.max(rect.y-margin-erode, 0)*scale,
w = Math.min(rect.width+margin*2-erode, src.cols-x)*scale,
h = Math.min(rect.height+margin*2-erode, src.rows-y)*scale;

    rect = new cv.Rect(x, y, w, h);

if (!rect.width) continue;
let cropped = orig.roi(rect);

let equalized = new cv.Mat();

cv.equalizeHist(cropped, equalized);

//let prototype_histogram = [0.0034814432392302505, 0.01108275247025388, 0.01663937251240755, 0.01665350584342571, 0.013283514014510086, 0.017685239007751326, 0.04627272765818175, 0.050334646992800686, 0.040643623818377814, 0.059487594064889356, 0.0870788847832684, 0.10157221193293291, 0.1318122907888438, 0.1812246369803452, 0.2136289326245939, 0.009116806125627949]; // equalized

//let prototype_histogram = [0.00003958333333333333, 0.000825, 0.0030291666666666666, 0.005375, 0.0036229166666666666, 0.0028125, 0.0023979166666666667, 0.002320833333333333, 0.0022833333333333334, 0.0023041666666666666, 0.0035916666666666666, 0.02115416666666667, 0.20890208333333332, 0.20064583333333333, 0.0012291666666666666, 0]; // clean

//let prototype_histogram = [0, 0.000016401124648547327, 0.00019798500468603563, 0.0006982193064667292, 0.002857310215557638, 0.006779522024367385, 0.007564432989690722, 0.009505623242736645, 0.010995782567947516, 0.014485707591377694, 0.01806701030927835, 0.016799437675726336, 0.01752108716026242, 0.039093252108716024, 0.05604615745079663, 0.09522258669165885] // messy

//let prototype_histogram = [0.000019791666666666665, 0.00042070056232427366, 0.0016135758356763512, 0.0030366096532333645, 0.003240113441112152, 0.004796011012183693, 0.0049811748281786946, 0.005913228288034989, 0.006639557950640425, 0.00839493712902218, 0.010829338487972509, 0.018976802171196502, 0.11321158524679786, 0.11986954272102468, 0.028637662058731646, 0.04761129334582943] // clean+messy avg

//let prototype_histogram = [0.04381020255063766, 0.04220180045011253, 0.04541110277569392, 0.044188297074268565, 0.04535708927231808, 0.03625206301575394, 0.042255813953488375, 0.04329182295573893, 0.05529107276819205, 0.034536384096024005, 0.042382595648912225, 0.05326706676669167, 0.04434958739684921, 0.04693998499624906, 0.03846211552888222, 0.044960990247561894] // clean cropped equalized

//let prototype_histogram = [0.030093642941985497, 0.0305123585583896, 0.03184825972118029, 0.03180352353713428, 0.030898336302825707, 0.02761353150787697, 0.030074781976744187, 0.0316042448112028, 0.03505803638409603, 0.02842235871467867, 0.030390256157789446, 0.03365540838334584, 0.03307166869842461, 0.03354811749812453, 0.027114391097774443, 0.031689870123780946] // clean+bg cropped equalized avg

//let prototype_histogram = [0.015113011724038672, 0.01531592623327165, 0.015989148604732602, 0.015960337213740523, 0.015520044440072647, 0.013867684216918804, 0.015101823978062815, 0.015866555395292123, 0.017581736092704057, 0.014280298382643927, 0.015195128078894723, 0.01682770419167292, 0.016673486645369755, 0.016774058749062265, 0.013714177741951888, 0.01593455549300575]; // clean+bg+messy cropped equalized avg

let prototype_histogram = [0.02159589070823089, 0.02255668779780612, 0.023596599808742895, 0.022124204615872514, 0.022859046976225372, 0.021460473766373882, 0.022753462626690823, 0.024306496002222205, 0.023577439689262757, 0.02037383261217718, 0.02436988211896724, 0.021968240692985745, 0.023846870854567846, 0.022352895841147788, 0.023736683769700628, 0.022780856141101525]; // clean+bg+messy+vignette cropped equalized avg

let srcVec = new cv.MatVector();
srcVec.push_back(equalized);
let accumulate = false;
let channels = [0];
let histSize = [16];
let ranges = [0, 255];
let hist = new cv.Mat();
let mask = new cv.Mat();
let color = new cv.Scalar(255, 255, 255);
scale = 2;
// You can try more different parameters
cv.calcHist(srcVec, channels, mask, hist, histSize, ranges, accumulate);
let result = cv.minMaxLoc(hist, mask);
let max = result.maxVal;

old_diff = difference;

difference = 0;
let relative_histogram = [];
let average_histogram = [];

// draw histogram
for (let i = 0; i < histSize[0]; i++) {
relative_histogram.push(hist.data32F[i]/(src.rows*src.cols));
average_histogram.push((relative_histogram[i]+prototype_histogram[i])/2);
    difference+= Math.abs(hist.data32F[i]/(src.rows*src.cols)-prototype_histogram[i]);
}
//console.log(relative_histogram, prototype_histogram, average_histogram);

console.log(i, first, rect.width, rect.height, rect.width*rect.height, difference, difference-old_diff);

width+= src.cols;
height+= src.rows;

if (difference < 0.5 && (!best_diff || (difference < best_diff /*&& src.rows*src.cols > best_size*/))) {
console.log(difference, best_diff, src.rows*src.cols, best_size);
best_diff = difference;
best_size = src.rows*src.cols;


cv.imshow('canvasOutput', cropped);
}

//console.log('average', width/(first/10), height/(first/10));

//endfor
}

orig.delete(); src.delete(); dst.delete(); prev.delete();