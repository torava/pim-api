import { getProductCategoryMinMaxAttributes, resolveProductAttributes } from './products';
import { mockStrippedCategories, mockAttributes, mockProducts } from '../setupTests';

it('should resolve product attributes by product name', () => {
  const product = mockProducts[0];
  const attributeIds = [1, 5];
  const {productAttributes} = resolveProductAttributes(product, attributeIds, undefined, mockStrippedCategories, mockAttributes);
  expect(productAttributes[0].value).toEqual(product.measure*mockStrippedCategories[3].attributes[1].value);
  expect(productAttributes[0].attribute).toBe(mockAttributes[0]);
});

it('should resolve product attributes by product name with food unit attribute', () => {
  const product = mockProducts[0];
  const attributeIds = [1, 5];
  const foodUnitAttribute = mockAttributes[2];
  const {productAttributes} = resolveProductAttributes(product, attributeIds, foodUnitAttribute, mockStrippedCategories, mockAttributes);
  const value = mockStrippedCategories[3].attributes[2].value/1000*mockStrippedCategories[3].attributes[1].value;
  expect(productAttributes[0].value).toEqual(value);
  expect(productAttributes[0].attribute).toBe(mockAttributes[0]);
});

it('should resolve product attributes by contributions with food unit attribute', () => {
  const product = mockProducts[1];
  const attributeIds = [1, 5];
  const foodUnitAttribute = mockAttributes[2];
  const {productAttributes} = resolveProductAttributes(product, attributeIds, foodUnitAttribute, mockStrippedCategories, mockAttributes);
  expect(productAttributes[0].attribute).toBe(mockAttributes[0]);
});

it('should get product category min max attributes', () => {
  const result = getProductCategoryMinMaxAttributes(mockStrippedCategories[3], mockProducts[0], undefined, 1, mockStrippedCategories, mockAttributes);
  const value = mockProducts[0].measure*mockStrippedCategories[3].attributes[1].value;
  expect(result.minAttributeValue).toEqual(value);
  expect(result.maxAttributeValue).toEqual(value);
});

it('should get product category min max attributes with food unit attribute', () => {
  const result = getProductCategoryMinMaxAttributes(mockStrippedCategories[3], mockProducts[0], mockAttributes[2], 5, mockStrippedCategories, mockAttributes);
  const value = mockStrippedCategories[3].attributes[2].value/100*mockStrippedCategories[3].attributes[0].value;
  expect(result.minAttributeValue).toEqual(value);
  expect(result.maxAttributeValue).toEqual(value);
});
