import { getClosestCategory, getStrippedCategories } from '../../utils/categories';
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

app.post('/api/item', async (req, res) => {
  const {
    item,
    attributeIds,
    acceptLocale
  } = req.body;
  console.log(req.body);
  try {
    const categories = (await Category.query()
    .withGraphFetched('[children, parent, attributes(filterByGivenAttributeIds).[attribute]]')
    .modifiers({
      filterByGivenAttributeIds: query => query.modify('filterByAttributeIds', attributeIds)
    }))
    .filter(category => !category.children?.length);
    const manufacturers = await Manufacturer.query();
    const strippedCategories = getStrippedCategories(categories, manufacturers);
    
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
      category = getClosestCategory(item.product?.name, strippedCategories);
    }
    const attributes = attributeIds.map(attributeId => {
      let value = 0;
      category.contributions?.forEach(contribution => {
        const attribute = contribution.attributes.find(a => a.attributeId === attributeId);
        if (attribute) {
          value+= attribute.value;
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
        attributes,
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