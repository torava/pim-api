import stringSimilarity from "string-similarity-js";
import { stripDetails, stripName } from "../../utils/transaction";
import Category from "../models/Category";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";

export const getProductsFromOpenFoodFactsRecords = async (records) => {
  const categories = await Category.query().withGraphFetched('attributes');
  const manufacturers = await Manufacturer.query();

  const strippedCategories = categories.filter(category => (
    category.attributes?.length ? true : false
  )).map(category => {
    const name = category.name;
    category.strippedName = stripName(name, manufacturers);
    return category;
  });

  let n = 0;

  for (const record of records) {
    const {
      quantity,
      brands,
      product_name
    } = record;
    const measureMatch = quantity.match(/([0-9]+)\s?([m|k]?[g|l])/);
    const measure = Number(measureMatch?.[1]);
    const unit = measureMatch?.[2];
    if (measure && unit && product_name !== '') {

      const brand = brands.split(',')[0];

      const productNameWithBrand = `${brand} ${product_name}`;
      const strippedProductName = stripDetails(product_name);

      let bestDistance = 0.4,
          categoryId;
      strippedCategories.forEach((category) => {
        Object.entries(category.strippedName).forEach(([locale, translation]) => {
          if (translation) {
            let distance = stringSimilarity(strippedProductName.toLowerCase() || '', translation.toLowerCase() || '');
            distance = Math.max(distance, stringSimilarity(productNameWithBrand.toLowerCase() || '', category.name[locale].toLowerCase() || '')+0.1);
            category.aliases?.forEach(alias => {
              distance = Math.max(distance, stringSimilarity(strippedProductName.toLowerCase() || '', alias.toLowerCase() || '')+0.1);
              distance = Math.max(distance, stringSimilarity(productNameWithBrand.toLowerCase() || '', alias.toLowerCase() || '')+0.1);
            });
            if (category.parent) {
              distance = Math.max(distance, stringSimilarity(strippedProductName || '', category.parent.name[locale] || ''));
            }

            if (distance > bestDistance) {
              bestDistance = distance;
              categoryId = category.id;
            }
          }
        });
      });

      await Product.query().insert({
        name: productNameWithBrand,
        measure,
        unit,
        categoryId
      });
      n++;
    }
  }

  console.log('added', n, 'products');
};
