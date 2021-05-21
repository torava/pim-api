export const getRootEntity = (entities, parentId) => {
  if (!parentId) return;

  const parent = entities.find(entity => entity.id === parentId);

  const parentsParent = getRootEntity(entities, parent.parentId);

  return parentsParent || parent;
};

export const convertMeasure = (measure, fromUnit, toUnit) => {
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
  if (fromUnit === 'l') {
    fromUnit = 'kg';
  }
  if (fromUnit && fromUnit.length > 1) {
    fromUnit = fromUnit.substring(0,1);
    fromUnit = fromUnit.toLowerCase();
  }
  else {
    fromUnit = '';
  }
  if (toUnit && toUnit.length > 1) {
    toUnit = toUnit.substring(0,1);
    toUnit = toUnit.toLowerCase();
  }
  else {
    toUnit = '';
  }
  let conversion = factors[fromUnit]-factors[toUnit];
  return measure*Math.pow(10, conversion);
}

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
  else if (name.hasOwnProperty(locale)) {
    return name[locale];
  }
  else if (!strict) {
    return first(name);
  }
  else return '';
}

export function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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
