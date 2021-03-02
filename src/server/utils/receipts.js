import { localeToOcrLanguage } from '../../utils/receipt';
import Category from '../models/Category';

export function processReceiptImage(filepath, data, resize) {
  return new Promise((resolve, reject) => {
    let script = [filepath,
                  '-auto-orient',
                  '-type', 'grayscale',
                  '-background', 'white',
                  '-bordercolor', 'white',
                  '-border', '10',
                  //'-normalize',
                  //'-contrast-stretch', '0'
                ],
        parameters = {threshold: 10, blur: 1, sharpen: 1};

    if (!data) data = {};

    if ('blur' in data) {
      parameters.blur = parseInt(data.blur || 0);
    }
    if ('threshold' in data) {
      parameters.threshold = parseInt(data.threshold || 10);
    }
    if ('sharpen' in data) {
      parameters.sharpen = parseInt(data.sharpen || 0);
    }

    // ./textcleaner -g -e normalize -T -f 50 -o 5 -a 0.1 -t 10 -u -s 1 -p 20 test.jpg test.png
    if (data.rotate)
      script = script.concat(['-gravity', 'Center', '-rotate', parseFloat(data.rotate), '+repage']);
    if (data.width && data.height)
      script = script.concat(['-gravity', 'NorthWest', '-crop', parseInt(data.width)+'x'+parseInt(data.height)+'+'+parseInt(data.x)+'+'+parseInt(data.y), '+repage']);

    if (resize) {
      script = script.concat(['-adaptive-resize', resize === true ? '800x' : resize,
      ]);
    }

    if (parameters.blur)
      script = script.concat(['-adaptive-blur', parameters.blur]);
    if (parameters.sharpen)
      script = script.concat(['-sharpen', '0x'+parameters.sharpen]);

    script = script.concat(['-lat', '50x50-'+parameters.threshold+'%']);

    script = script.concat([
        '-set', 'option:deskew:autocrop', '1',
        '-deskew', '40%',
        '-fuzz', '5%',
        '-trim',
        '+repage',
        '-strip',
        'PNG:'+filepath+'_edited']);
    
    console.log(script.join(' '));
    child_process.execFile('convert', script, function(error, stdout, stderr) {
      if (error) console.error(error);
      process.stdout.write(stdout);
      process.stderr.write(stderr);
      resolve();
    });
  });
}

export function extractTextFromFile(filepath, locale) {
  let language = localeToOcrLanguage(locale);

  return new Promise((resolve, reject) => {
    child_process.execFile('tesseract', [
      '-l',
      ['fin'].indexOf(language) !== -1 ? `${language}+eng` : 'eng',
      '-c', 'load_number_dawg=0',
      '-psm', 6,
      filepath+'_edited',
      'stdout'
    ], function(error, stdout, stderr) {
      if (error) console.error(error);
      process.stdout.write(stdout);
      process.stderr.write(stderr);

      resolve(stdout);
    });
  });
}

export function getClosestCategory(toCompare, locale) {
  return new Promise((resolve, reject) => {
    Category.query()
    .then(categories => {
      let name, category, response = null, max_distance = 0, distance, match;
      toCompare = toCompare.toLowerCase();
      for (let i in categories) {
        category = categories[i];
        name = category.name[locale];
        if (!name) continue;
        match = new RegExp('\\b'+_.escapeRegExp(name)+'\\b', 'i');
        distance = toCompare.match(match) && name.length/toCompare.length;
        if (distance > max_distance) {
          max_distance = distance;
          response = category;
        }
      }
      resolve(response);
    })
    .catch(reject);
  });
}
