import { getCategoriesWithAttributes, getClosestCategory, getStrippedCategories } from '../../utils/categories';
import { getAttributeValue } from '../../utils/items';
import Attribute from '../models/Attribute';
import Category from '../models/Category';
import Item from '../models/Item';
import Manufacturer from '../models/Manufacturer';

export default app => {

app.get('/api/item', async (req, res) => {
  const items = await Item.query()
    .withGraphFetched('[product.[category.[parent.^], manufacturer], transaction.[party]]');
  res.send(items);
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


app.post('/api/item', async (req, res) => {
  const {
    item,
    attributeIds,
    acceptLocale
  } = req.body;
  console.log(req.body);
  try {
    const categories = (await Category.query()
    .withGraphFetched('[children, parent, contributions, attributes(filterByGivenAttributeIds).[attribute]]')
    .modifiers({
      filterByGivenAttributeIds: query => query.modify('filterByAttributeIds', attributeIds)
    }))
    const childCategories = categories.filter(category => !category.children?.length);
    const manufacturers = await Manufacturer.query();
    const attributes = await Attribute.query();
    const strippedCategories = getStrippedCategories(childCategories, manufacturers);

    // TODO: change to enum
    const foodUnitAttribute = attributes.find(a => a.name['en-US'] === 'Food units');
    
    let category,
        contributionList = item.product.contributionList.split(/,\s|\sja\s|\sand\s|\soch\s/gi);
    if (contributionList) {
      console.log(contributionList);
      let contributions = [];
      contributionList.forEach(contributionListPart => {
        let [contribution, token] = getClosestCategory(contributionListPart, strippedCategories, acceptLocale);
        if (contributionListPart.split(' ').length > 2) {
          while (contribution && contributionListPart) {
            contributionListPart = contributionListPart.replace(new RegExp(token.substring, 'i'), '').trim();
            contributions.push(contribution);
            [contribution, token] = getClosestCategory(contributionListPart, strippedCategories, acceptLocale);
          }
        } else if (contribution) {
          contributions.push(contribution);
        }
      });
      console.log(contributionList);
      category = {
        contributions
      };
    } else {
      category = getClosestCategory(item.product?.name, strippedCategories, acceptLocale);
    }
    const productAttributes = attributeIds.map(attributeId => {
      let value = 0;
      console.log('attributeId', attributeId);
      category.contributions?.forEach(contribution => {
        const portionAttribute = contribution.attributes.find(a => a.attribute.parentId === foodUnitAttribute.id);
        if (!portionAttribute) {
          throw 'No food unit attribute provided';
        }
        console.log('contribution', contribution);
        console.log('portionAttribute', portionAttribute);
        const result = getCategoriesWithAttributes(categories, contribution, Number(attributeId));
        console.log('result', result?.[0]);
        const [, categoryAttributes] = result?.[0] || [undefined, undefined];
        const [attributeValue, categoryAttribute] = getAttributeValue(portionAttribute.unit, portionAttribute.value, 1, null, categoryAttributes, attributes) || [undefined, undefined];
        console.log('categoryAttribute', categoryAttribute);
        console.log('attribute', attributeValue);
        if (attributeValue) {
          value+= attributeValue;
        }
      });
      return {
        value,
        attributeId
      }
    });
    const itemWithCategory = {
      ...item,
      product: {
        ...item.product,
        attributes: productAttributes,
        category
      }
    };
    res.send(itemWithCategory);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

}