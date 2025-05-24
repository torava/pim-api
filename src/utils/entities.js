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
};

export const getRootEntity = (entities, parentId) => {
  if (!parentId) return;

  const parent = entities.find(entity => entity.id === parentId);

  const parentsParent = getRootEntity(entities, parent.parentId);

  return parentsParent || parent;
};

export const getParentWithFieldValue = (entities, parentId, field, value) => {
  if (!parentId) return;
  const parent = entities.find(entity => entity.id === parentId);
  if (parent?.field === value) {
    return parent;
  } else {
    return getParentWithFieldValue(entities, parent?.parentId, field, value);
  }
};

export const getLeafIds = (entities, parentId, leafIds = []) => {
  const children = entities.filter(entity => entity.parentId === parentId);
  let result = [];
  children.forEach(child => {
    const childChildren = getLeafIds(entities, child.id, leafIds);
    if (!childChildren.length) {
      leafIds.push(child.id);
    }
    result.push(child.id);
    result = result.concat(childChildren);
  });
  return result;
};

export const convertMeasure = (measure, fromUnit, toUnit) => {
  let offset = 0;
  // assumes that 1 l = 1 kg
  if (fromUnit?.substring(fromUnit?.length-1) === 'l') {
    offset+= 3;
  }
  if (toUnit?.substring(toUnit?.length-1) === 'l') {
    offset-= 3;
  }
  if (fromUnit && fromUnit.length > 1) {
    fromUnit = fromUnit.substring(0,1);
  }
  else {
    fromUnit = '';
  }
  if (toUnit && toUnit.length > 1) {
    toUnit = toUnit.substring(0,1);
  }
  else {
    toUnit = '';
  }
  const conversion = factors[fromUnit]-factors[toUnit]+offset;
  return measure*Math.pow(10, conversion);
};

export const measureRegExp = /(\d{1,4}([.|,]\d)?)\s?((m|d|k)?(l|g)?)/;

export function first(list) {
  for (let i in list) {
    return list[i];
  }
}

export function getTranslation(name, locale, strict) {
  if (!name) {
    return name;
  }
  if (typeof name === 'string') {
    return name;
  } 
  else if (name[locale]) {
    return name[locale];
  }
  else if (!strict) {
    return first(name);
  }
  else return '';
}

export function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function stringToSlug(str,  sep) {
  let sep_regexp = escapeRegExp(sep);

  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
  var to = "aaaaaaeeeeiiiioooouuuunc------";

  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(new RegExp("-+", "g"), sep) // collapse dashes
    .replace(new RegExp(sep_regexp+"+"), "") // trim - from start of text
    .replace(new RegExp(sep_regexp+"+$"), ""); // trim - from end of text

  return str;
}

export const flattenObject = (obj) => {
  const flattened = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value));
    } else {
      flattened[key] = value;
    }
  });

  return Object.values(flattened).flat();
};
