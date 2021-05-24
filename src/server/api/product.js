import Product from '../models/Product';
import { getCategoriesWithAttributes, getClosestCategory, getStrippedCategories } from '../../utils/categories';
import { convertMeasure } from '../../utils/entities';
import { getAttributeValues } from '../../utils/items';
import Attribute from '../models/Attribute';
import Category from '../models/Category';
import Manufacturer from '../models/Manufacturer';

export default app => {

app.get('/api/product/:id', async (req, res) => {
  const attributeIds = req.query.attributeIds.split(',').map(id => Number(id));
  const foodUnitAttributeId = Number(req.query.foodUnitAttributeId);
  const {
    id
  } = req.params;
  try {
    let measure,
        productAttributes = [];

    const categories = (await Category.query()
    .withGraphFetched('[children, parent, contributions, attributes.[attribute]]')
    .modifiers({
      filterByGivenAttributeIds: query => query.modify('filterByAttributeIds', [...attributeIds, foodUnitAttributeId])
    }));
    const attributes = await Attribute.query();
    const foodUnitParentAttribute = attributes.find(a => a.name['en-US'] === 'Food units');
    const foodUnitAttribute = attributes.find(a => a.id === foodUnitAttributeId && a.parentId === foodUnitParentAttribute.id)

    const product = (await Product.query().findById(id)
    .withGraphFetched('[contributions.[contribution]]'));

    if (foodUnitAttribute) {
      attributeIds.forEach(attributeId => {
        let minValue = 0,
            maxValue = 0,
            unit;
        product.contributions.forEach(productContribution => {
          const contribution = categories.find(category => category.id === productContribution.contributionId);
          const portionAttribute = contribution.attributes.find(a => a.attribute.id === foodUnitAttribute.id);
          if (!portionAttribute) {
            return true;
          }
          console.log('contribution', contribution);
          console.log('portionAttribute', portionAttribute);

          const result = getCategoriesWithAttributes(categories, contribution.id, Number(attributeId));
          console.log('result', result);
          const [, categoryAttributes] = result?.[0] || [undefined, undefined];
          const attributeResult = getAttributeValues(portionAttribute.unit, portionAttribute.value, 1, undefined, categoryAttributes, attributes);
          if (attributeResult.length) {
            console.log('attributeResult', attributeResult);
            const minAttributeResult = attributeResult.reduce((a, b) => a[0] < b[0] ? a : b);
            const maxAttributeResult = attributeResult.reduce((a, b) => a[0] > b[0] ? a : b);
            const [minAttributeValue, minCategoryAttribute] = minAttributeResult || [undefined, undefined];
            const [maxAttributeValue, maxCategoryAttribute] = maxAttributeResult || [undefined, undefined];
            console.log('minCategoryAttribute', minCategoryAttribute);
            console.log('minAttributeValue', minAttributeValue);
            console.log('maxCategoryAttribute', maxCategoryAttribute);
            console.log('maxAttributeValue', maxAttributeValue);
            minValue+= minAttributeValue || 0;
            maxValue+= maxAttributeValue || 0;
            unit = minCategoryAttribute.unit.split('/')[0];
          }

          if (!minValue && !maxValue && contribution.contributions?.length) {
            const totalAmount = contribution.contributions.reduce((previousValue, currentValue) => previousValue.amount+currentValue.amount, 0);
            contribution.contributions.forEach(contributionContribution => {
              const result = getCategoriesWithAttributes(categories, contributionContribution.contributionId, Number(attributeId));
              console.log('result', result);
              const [, categoryAttributes] = result?.[0] || [undefined, undefined];
              const attributeResult = getAttributeValues(portionAttribute.unit, portionAttribute.value*contributionContribution.amount/totalAmount, 1, undefined, categoryAttributes, attributes);
              if (attributeResult.length) {
                console.log('attributeResult', attributeResult);
                const minAttributeResult = attributeResult.reduce((a, b) => a[0] < b[0] ? a : b, [undefined, undefined]);
                const maxAttributeResult = attributeResult.reduce((a, b) => a[0] > b[0] ? a : b, [undefined, undefined]);
                const [minAttributeValue, minCategoryAttribute] = minAttributeResult || [undefined, undefined];
                const [maxAttributeValue, maxCategoryAttribute] = maxAttributeResult || [undefined, undefined];
                console.log('minCategoryAttribute', minCategoryAttribute);
                console.log('minAttributeValue', minAttributeValue);
                console.log('maxCategoryAttribute', maxCategoryAttribute);
                console.log('maxAttributeValue', maxAttributeValue);
                minValue+= minAttributeValue || 0;
                maxValue+= maxAttributeValue || 0;
                unit = minCategoryAttribute.unit.split('/')[0];
              }
            });
          }
        });
        const attribute = attributes.find(a => a.id === attributeId);
        if (minValue === maxValue) {
          productAttributes.push({
            value: minValue,
            unit,
            attribute
          });
        } else {
          productAttributes.push({
            value: minValue,
            type: 'MIN_VALUE',
            unit,
            attribute
          });
          productAttributes.push({
            value: maxValue,
            type: 'MAX_VALUE',
            unit,
            attribute
          });
        }
      });
      console.log('productAttributes', productAttributes);
      measure = product.contributions.reduce((total, productContribution) => {
        const contribution = categories.find(category => category.id === productContribution.contributionId);
        const portionAttribute = contribution.attributes.find(a => a.attribute.id === foodUnitAttribute.id);
        console.log('portionAttribute', portionAttribute);
        return total+convertMeasure(portionAttribute.value, portionAttribute.unit, 'kg');
      }, 0);
    }

    const resolvedProduct = {
      ...product,
      measure,
      unit: measure ? 'kg' : null,
      attributes: productAttributes
    };

    console.log('resolvedProduct', resolvedProduct);
    
    res.send(resolvedProduct);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get('/api/product', async (req, res) => {
  try {
    const product = await Product.query();
    res.send(product);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get('/api/product/populate', function(req, res) {
  Product.query()
  .eager('[category.[parent.^], items.[transaction]]')
    .then(product => {
      res.send(product);
    })
    .catch(error => {
      console.error(error);
      throw new Error();
    });
});

/*
{
  "product": {
    "name": "Mayur Special Tarkari",
    "contributionList": "Keitetyt kasvikset, perunaa, juustoa, cashew-pähkinöitä ja bambuja kookos kermaisessa tomaattikastikkeessa"
  },
  "price": 17
}
*/


/*
REST API JSON request
const exampleRequest = {
  "product": {
    "name": "Mayur Special Tarkari",
    "contributionList": "Cooked vegetables, potatoes, cashew nuts and bamboo in coconut creamy tomato sauce"
  },
  "price": 17
}

REST API JSON response
const exampleResponse = {
  "product": {
    "name": "Mayur Special Tarkari",
    "measure": 0.598,
    "unit": "kg",
    "attributes": [
      {
        "name": "GHG min per portion",
        "unit": "kgCO₂eq/portion",
        "value": 0.322824
      },
      {
        "name": "GHG max per portion",
        "unit": "kgCO₂eq/portion",
        "value": 0.71004
      },
      {
        "name": "GHG min per kg",
        "unit": "kgCO₂eq/kg",
        "value": 0.5398394649
      },
      {
        "name": "GHG max per kg",
        "unit": "kgCO₂eq/kg",
        "value": 1.18735786
      },
      {
        "name": "Energy per 100 g",
        "unit": "kcal/hg",
        "value": 149.3244147
      },
      {
        "name": "Energy per portion",
        "unit": "kcal/portion",
        "value": 892.96
      }
    ]
  }
}
*/


app.post('/api/product', async (req, res) => {
  const {name, contributionList} = req.body;

  const contentLanguage = req.headers['content-language'];

  console.log(req.body);
  try {
    const categories = (await Category.query()
    .withGraphFetched('[children, parent, contributions, attributes.[attribute]]'));

    const childCategories = categories.filter(category => !category.children?.length);
    const manufacturers = await Manufacturer.query();
    const strippedCategories = getStrippedCategories(childCategories, manufacturers);
    
    let category,
        contributions = [],
        contributionTokens = contributionList?.split(/,\s|\sja\s|\sand\s|\soch\s/gi);
    if (contributionList) {
      console.log(contributionList);
      contributionTokens.forEach(contributionToken => {
        let [contribution, token] = getClosestCategory(contributionToken, strippedCategories, contentLanguage);
        if (contributionToken.split(' ').length > 2) {
          while (contribution && contributionToken) {
            contributionToken = contributionToken.replace(new RegExp(token.substring, 'i'), '').trim();
            contributions.push({contributionId: contribution.id});
            [contribution, token] = getClosestCategory(contributionToken, strippedCategories, contentLanguage);
          }
        } else if (contribution) {
          contributions.push({contributionId: contribution.id});
        }
      });
      console.log(contributionList);
    } else {
      category = getClosestCategory(name, strippedCategories, contentLanguage);
    }
    const resolvedProduct = {
      name,
      contributionList,
      //measure,
      //unit: 'kg',
      //attributes: productAttributes,
      contributions,
      category
    };
    console.log('resolvedProduct', resolvedProduct);
    const upsertedProduct = await Product.query().upsertGraph(resolvedProduct, {
      relate: true
    });
    res.send(upsertedProduct);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

}