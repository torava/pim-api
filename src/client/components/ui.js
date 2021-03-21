class Ui {
  constructor() {
    this.currentGroupId;
    this.format = window.localStorage.getItem('format') || 'text/csv';
    this.crop = window.localStorage.getItem('crop') !== null ?
    (window.localStorage.getItem('crop') === '1' ? true : false) : true;
  }
  getCurrentGroup() {
    return this.currentGroupId
  }
  getFormat() {
    return this.format;
  }
  setFormat(format) {
    window.localStorage.setItem('format', format);
    this.format = format;
  }
  getCrop() {
    return this.crop;
  }
  setCrop(crop) {
    window.localStorage.setItem('crop', crop ? '1' : '0');
    this.crop = crop;
  }
}

export default new Ui();
