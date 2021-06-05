import apicache from 'apicache';

import Product from '../models/Product';
import { getClosestCategory, getContributionsFromList } from '../../utils/categories';
import Attribute from '../models/Attribute';
import Category from '../models/Category';
import { resolveProductAttributes } from '../../utils/products';
import { getStrippedChildCategories } from '../utils/categories';
import { getLeafIds } from '../../utils/entities';

let cache = apicache.middleware;

export default app => {

app.get('/api/product/:id', cache(), async (req, res) => {
  const {
    id
  } = req.params;
  try {
    const attributes = await Attribute.query();
    const attributeIds = req.query.attributeCodes?.split(',').map(code => (
      attributes.find(attribute => attribute.code === code)?.id
    )) || attributes.map(a => a.id);
    const foodUnitParentAttribute = attributes.find(a => a.name['en-US'] === 'Food units');
    const foodUnitAttribute = attributes.find(attribute => (
      attribute.code === Number(req.query.foodUnitAttributeCode) && attribute.parentId === foodUnitParentAttribute.id
    ));

    const categories = (await Category.query()
    .withGraphFetched('[children, parent, contributions, attributes.[attribute]]')
    .modifiers({
      filterByGivenAttributeIds: query => query.modify('filterByAttributeIds', [...attributeIds, foodUnitAttribute.id])
    }));

    const product = (await Product.query().findById(id)
    .withGraphFetched('[contributions.[contribution]]'));

    const {productAttributes, measure} = resolveProductAttributes(product, attributeIds, foodUnitAttribute, categories, attributes);

    const resolvedProduct = {
      ...product,
      measure: measure || product.measure,
      unit: measure ? 'kg' : product.unit,
      attributes: productAttributes || product.attributes
    };
    
    res.send(resolvedProduct);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get('/api/product', async (req, res) => {
  const {
    pageNumber,
    productsPerPage,
    name,
    contributionList,
  } = req.query;
  try {
    let products;
    const attributes = await Attribute.query();
    let attributeIds = [];
    req.query.attributeCodes?.split(',').forEach(code => {
      const id = attributes.find(attribute => attribute.code === code)?.id;
      if (id) {
        let ids = [];
        getLeafIds(attributes, id, ids);
        if (ids.length) {
          attributeIds = attributeIds.concat(ids);
        } else {
          attributeIds.push(id);
        }
      }
    }) || attributes.map(a => a.id);
    const foodUnitParentAttribute = attributes.find(a => a.name['en-US'] === 'Food units');
    const foodUnitAttribute = attributes.find(attribute => (
      attribute.code === req.query.foodUnitAttributeCode && attribute.parentId === foodUnitParentAttribute.id
    ));
    products = (
      await Product.query()
      .page(pageNumber, productsPerPage)
      .where('name', 'ilike', name ? `%${name}%` : undefined)
      .skipUndefined()
    );
    let product = products.results?.[0];
    if (foodUnitAttribute) {
      const contentLanguage = req.headers['content-language'];

      const strippedCategories = await getStrippedChildCategories();
      
      let category,
          contributions = [];

      console.log(contributionList);
      contributions = getContributionsFromList(contributionList, contentLanguage, strippedCategories);
      console.log(contributionList);
      
      product = {
        name,
        contributionList,
        //measure,
        //unit: 'kg',
        //attributes: productAttributes,
        contributions,
        category,
        ...product
      };

      const categories = (await Category.query()
      .withGraphFetched('[children, parent, contributions, attributes.[attribute]]')
      .modifiers({
        filterByGivenAttributeIds: query => query.modify('filterByAttributeIds', [...attributeIds, foodUnitAttribute.id])
      }));

      const {productAttributes, measure} = resolveProductAttributes(product, attributeIds, foodUnitAttribute, categories, attributes);

      product = {
        ...product,
        measure: measure || product.measure,
        unit: measure ? 'kg' : product.unit,
        attributes: productAttributes || product.attributes
      };
      products = [product];
    }
    res.send(products);
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
    const strippedCategories = getStrippedChildCategories();
    
    let category,
        contributions = [];
    if (contributionList) {
      console.log(contributionList);
      contributions = getContributionsFromList(contributionList, contentLanguage, strippedCategories);
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
    res.status(201).send(upsertedProduct);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

}