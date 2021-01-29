export const getRootEntity = (entities, parentId) => {
  if (!parentId) return;

  const parent = entities.find(entity => entity.id === parentId);

  const parentsParent = getRootEntity(entities, parent.parentId);

  return parentsParent || parent;
};

export const convertMeasure = (measure, from_unit, to_unit) => {
  const factors = {
    y: -24,
    z: -21,
    a: -16,
    f: -15,
    p: -12,
    n: -9,
    µ: -6,
    m: -3,
    c: -2,
    d: -1,
    '': 0,
    da: 1,
    h: 2,
    k: 3,
    M: 6,
    G: 9,
    T: 12,
    P: 15,
    E: 18,
    Z: 21,
    Y: 24
  }
  // assumes that 1 l = 1 kg
  if (from_unit === 'l') {
    from_unit = 'kg';
  }
  if (from_unit && from_unit.length > 1) {
    from_unit = from_unit.substring(0,1);
    from_unit = from_unit.toLowerCase();
  }
  else {
    from_unit = '';
  }
  if (to_unit && to_unit.length > 1) {
    to_unit = to_unit.substring(0,1);
    to_unit = to_unit.toLowerCase();
  }
  else {
    to_unit = '';
  }
  let conversion = factors[from_unit]-factors[to_unit];
  return measure*Math.pow(10, conversion);
}
