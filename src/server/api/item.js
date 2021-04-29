import { getClosestCategory, getStrippedCategories } from '../../utils/categories';
import Category from '../models/Category';
import Item from '../models/Item';
import Manufacturer from '../models/Manufacturer';

export default app => {

app.get('/api/item', async (req, res) => {
  const items = await Item.query()
    .eager('[product.[category.[parent.^], manufacturer], transaction.[party]]');
  if (req.body.category) {
    const filteredItems = items.filter(item => item.product.category.id === req.body.category);
    res.send(filteredItems);
  } else {
    res.send(items);
  }
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
  const item = req.body;

  try {
    const categories = (await Category.query()
    .withGraphFetched('[children, parent]'))
    .filter(category => !category.children?.length);
    const manufacturers = await Manufacturer.query();
    const strippedCategories = getStrippedCategories(categories, manufacturers);
    
    let category,
        contributionList = item.product.contributionList.split(/,\s|\sja\s/gi);
    if (contributionList) {
      console.log(contributionList);
      let contributions = [];
      contributionList.forEach(contributionListPart => {
        let [contribution, token] = getClosestCategory(contributionListPart, strippedCategories);
        if (contributionListPart.split(' ').length > 2) {
          while (contribution && contributionListPart) {
            contributionListPart = contributionListPart.replace(new RegExp(token.substring, 'i'), '').trim();
            contributions.push(contribution);
            [contribution, token] = getClosestCategory(contributionListPart, strippedCategories);
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
    const itemWithCategory = {
      ...item,
      product: {
        ...item.product,
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