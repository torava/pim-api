export const recognizeClientside = async (data, worker) => {
  const { data: { text } } = await worker.recognize(data);

  return text;
};
