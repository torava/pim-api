import { createWorker } from 'tesseract.js';

export const setupWorker = async logger => {
  const worker = createWorker({
    langPath: `${window.location.origin}/lib/tesseract.js/tessdata/fast`,
    logger
  });

  (async () => {
    await worker.load();
    await worker.loadLanguage('fin+eng');
    await worker.initialize('fin+eng');
    await worker.setParameters({
      psm: 4,
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzäöåABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÅ1234567890-,.:/% ',
      textord_max_noise_size: 15
    });
  })();

  return worker;
};
