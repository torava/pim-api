import winkTokenizer from 'wink-tokenizer';

import { getClosestCategory, getStrippedCategories } from '../../utils/categories';
import Category from '../models/Category';
import Item from '../models/Item';
import Manufacturer from '../models/Manufacturer';
import { NER } from '../utils/categories';

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
    const categories = await Category.query().withGraphFetched('[attributes, parent]');
    const manufacturers = await Manufacturer.query();
    const strippedCategories = getStrippedCategories(categories, manufacturers).sort((a, b) => b.name['en-US'].length-b.name['en-US'].length);
    
    let category,
        contributionList = item.product.contributionList;
    if (contributionList) {
      let contributions = [];

      const tokens = winkTokenizer().tokenize(contributionList);
      const recognizedTokens = NER.recognize(tokens);
      
      console.log(recognizedTokens);
      
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