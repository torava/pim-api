import express, { Request } from 'express';

import Product, { ProductPartialShape } from '../models/Product';
import { findFoodUnitAttribute, findMeasure, getClosestCategory, getContributionsFromList } from '../utils/categories';
import Attribute, { AttributeShape } from '../models/Attribute';
import Category from '../models/Category';
import { resolveProductAttributes, getClosestProduct } from '../utils/products';
import { getStrippedChildCategories } from '../utils/categories';
import { getLeafIds } from '../utils/entities';
import { Page } from 'objection';
import { Locale } from '../utils/types';
import { CategoryContributionPartialShape } from '../models/CategoryContribution';

export default async (app: express.Application) => {

app.get('/api/product/all', async (req, res) => {
  try {
    let products = await Product.query();
    return res.send(products);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});
  
app.get('/api/product/:id', async (req: Request<
  { id: string },
  ProductPartialShape,
  undefined,
  {
    foodUnitAttributeCode: string,
    attributeCodes: string
  }
>, res) => {
  const {
    id
  } = req.params;
  try {
    const attributes = await Attribute.query();
    const attributeIds = req.query.attributeCodes?.split(',').map(code => (
      attributes.find(attribute => attribute.code === code)?.id
    )) || attributes.map(a => a.id);
    const foodUnitParentAttribute = attributes.find(attribute => attribute.name['en-US'] === 'Food units');
    const foodUnitAttribute = attributes.find(attribute => (
      attribute.code === req.query.foodUnitAttributeCode && attribute.parentId === foodUnitParentAttribute.id
    ));

    const categories = (await Category.query()
    .withGraphFetched('[children, parent, contributions, attributes.[attribute]]')
    .modifiers({
      filterByGivenAttributeIds: query => query.modify('filterByAttributeIds', [...attributeIds, foodUnitAttribute.id])
    }));

    const product = (await Product.query().findById(id)
    .withGraphFetched('[contributions.[contribution]]'));

    const {productAttributes, measure} = resolveProductAttributes(product, attributeIds, foodUnitAttribute, categories, attributes);

    const resolvedProduct: ProductPartialShape = {
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

app.get('/api/product', async (req: Request<undefined, Page<Product> | ProductPartialShape[], undefined, {
  pageNumber: number,
  productsPerPage: number,
  brand: string,
  category: string,
  quantity: number,
  measure: number,
  unit: string,
  attributeCodes: string,
  foodUnitAttributeCode: string,
  name: string,
  contributionList: string
}>, res) => {
  let {
    pageNumber = 0,
    productsPerPage = 20,
    brand,
    category,
    quantity,
    measure,
    unit,
    attributeCodes,
    foodUnitAttributeCode = 'PORTM'
  } = req.query;
  const name = req.query.name?.trim();
  const contributionList = req.query.contributionList?.trim();
  try {
    let products: Page<Product> | ProductPartialShape[];
    if (!name && !contributionList) {
      products = (
        await Product.query()
        .page(pageNumber, productsPerPage)
      );
    } else {
      const attributes = await Attribute.query();
      let attributeIds: Attribute['id'][] = [];
      attributeCodes?.split(',').forEach(code => {
        const id = attributes.find(attribute => attribute.code === code)?.id;
        if (id) {
          let ids: Attribute['id'][] = [];
          getLeafIds(attributes, id, ids);
          if (ids.length) {
            attributeIds = attributeIds.concat(ids);
          } else {
            attributeIds.push(id);
          }
        }
      });
      if (!attributeCodes) {
        attributeIds = attributes.map(a => a.id);
      }

      let foodUnitAttribute: AttributeShape;
      
      if (foodUnitAttributeCode) {
        const foodUnitParentAttribute = attributes.find(a => a.name['en-US'] === 'Food units');
        foodUnitAttribute = attributes.find(attribute => (
          attribute.code === foodUnitAttributeCode && attribute.parentId === foodUnitParentAttribute.id
        ));
      }

      const productEntries = await Product.query().withGraphFetched('[attributes.[attribute], brand]');

      let product: ProductPartialShape;

      const measureResult = findMeasure(name);
      if (measureResult.unit) {
        measure = measureResult.measure;
        unit = measureResult.unit;
      }
      foodUnitAttribute = findFoodUnitAttribute(name, attributes);
  
      product = {
        measure,
        unit
      }

      if (brand) {
        const productEntriesWithBrand = productEntries.filter(filterableProduct => filterableProduct.brand?.name === brand);

        [product] = getClosestProduct(name, productEntriesWithBrand);
      } else {
        [product] = getClosestProduct(name, productEntries);
      }

      const contentLanguage = req.headers['accept-language'].toString().split(',')[0];

      console.log(contentLanguage);

      let contributions = [];

      const strippedCategories = await getStrippedChildCategories();
      
      if (!product) {
        let [category] = getClosestCategory(name, strippedCategories, contentLanguage as Locale);
        if (category) {
          product = {
            ...product,
            categoryId: category?.id
          };
        }
      }

      if (contributionList) {
        let list = contributionList;

        if (category) {
          list = `${category}, ${contributionList}`;
        }

        contributions = getContributionsFromList(list, contentLanguage as Locale, strippedCategories, attributes);
          
        product = {
          name,
          contributionList,
          //attributes: productAttributes,
          contributions
        };
      }

      if (!contributions.length) {
        product = {
          ...product
        };
      }

      product = {
        ...product,
        measure: Number(req.query.measure) || product?.measure,
        unit: unit || product?.unit,
        quantity: Number(quantity) || 1
      };

      const categories = (await Category.query()
      .withGraphFetched('[children, parent, contributions, attributes.[attribute]]')
      .modifiers({
        filterByGivenAttributeIds: query => query.modify('filterByAttributeIds', [...attributeIds, foodUnitAttribute.id])
      }));

      const productAttributeResult = resolveProductAttributes(product, attributeIds, foodUnitAttribute, categories, attributes);
      const productAttributes = productAttributeResult.productAttributes;
      measure = productAttributeResult.measure;
      product = {
        name: product.name,
        contributionList: product.contributionList,
        /*contributions: product.contributions?.map(contribution => ({
          ...contribution, contribution: {
            ...contribution.contribution,
            attributes: undefined
          }
        })),*/
        categoryId: product.categoryId,
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

/*
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
*/

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

  const contentLanguage = req.headers['content-language'] as Locale;

  console.log(req.body);
  try {
    const strippedCategories = await getStrippedChildCategories();
    
    let category,
        contributions: CategoryContributionPartialShape[] = [];
    if (contributionList) {
      console.log(contributionList);
      contributions = getContributionsFromList(contributionList, contentLanguage, strippedCategories);
      console.log(contributionList);
    } else {
      [category] = getClosestCategory(name, strippedCategories, contentLanguage);
    }
    const resolvedProduct = {
      name,
      contributionList,
      //measure,
      //unit: 'kg',
      //attributes: productAttributes,
      contributions,
      category
    } as Product;
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