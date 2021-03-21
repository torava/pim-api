class Ui {
  constructor() {
    this.currentGroupId;
    this.format = 'text/csv';
  }
  getCurrentGroup() {
    return this.currentGroupId
  }
  getFormat() {
    return this.format;
  }
  setFormat(format) {
    this.format = format;
  }
}

export default new Ui();
