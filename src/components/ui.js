class Ui {
  constructor() {
    this.currentGroupId = -1;
  }
  getCurrentGroup() {
    return this.currentGroupId
  }
  setCurrentGroup(id) {
    this.currentGroupId = id;
  }
}

export default new Ui();
