import { mockAttributes, mockCategories, mockCategoryChildren } from "../setupTests";
import { getCategoryMinMaxAttributes, getContributionsFromList, getStrippedCategories, getTokensFromContributionList, resolveCategoryAttributes } from "./categories";

describe('categories utils', () => {
  it('should get tokens from contribution list', () => {
    expect(getTokensFromContributionList('Macaroni dark 500g [macaroni] (10%) and water (90%)')).toEqual(['Macaroni dark 500g', 'water']);
    expect(getTokensFromContributionList('Fresh ravioli with spinach & cheese filling cooked with a creamy sauce.')).toEqual([
      'Fresh ravioli with spinach',
      'cheese filling cooked with a creamy sauce'
    ]);
  });

  it('should strip category names', () => {
    const strippedCategories = getStrippedCategories(mockCategoryChildren);
    expect(strippedCategories[0].strippedName).toEqual({
      'en-US': 'Macaroni dark',
      'fi-FI': 'Makaroni tumma',
      'sv-SE': 'Makaroner mörka kokta utan salt'
    });
    expect(strippedCategories[4].strippedName).toEqual({
      "en-US": "Ravioli spinach",
      "fi-FI": "Pasta ravioli pinaatti",
      "sv-SE": "Pasta fylld pasta ravioli med spenatfyllning"
    });
  });

  it('should get contributions', () => {
    const mockStrippedCategoryChildren = getStrippedCategories(mockCategoryChildren);
    console.log('mockStrippedCategoryChildren', mockStrippedCategoryChildren);
    let contributions = getContributionsFromList('Macaroni dark 500g [macaroni] (100%)', undefined, mockStrippedCategoryChildren);
    expect(contributions.length).toBe(1);
    expect(contributions[0].contributionId).toBe(302);
    expect(contributions[0].amount).toBe(500);
    expect(contributions[0].unit).toBe('g');

    contributions = getContributionsFromList('Fresh ravioli with spinach', undefined, mockStrippedCategoryChildren);
    expect(contributions.length).toBe(1);
    expect(contributions[0].contributionId).toBe(945);

    contributions = getContributionsFromList('cheese filling cooked with a creamy sauce', undefined, mockStrippedCategoryChildren);
    console.dir(contributions, {depth: null});
    expect(contributions.length).toBe(2);
    expect(contributions[0].contributionId).toBe(3776);
    expect(contributions[1].contributionId).toBe(3592);
  });

  const mockStrippedCategories = getStrippedCategories(mockCategories);

  it('should get category min max attributes with food unit attribute', () => {
    const result = getCategoryMinMaxAttributes(mockStrippedCategories[3], undefined, mockAttributes[2], 5, mockStrippedCategories, [], mockAttributes);
    const value = mockStrippedCategories[3].attributes[2].value/100*mockStrippedCategories[3].attributes[0].value;
    expect(result.minAttributeValue).toEqual(value);
    expect(result.maxAttributeValue).toEqual(value);
  });

  it('should resolve category attributes with food unit attribute', () => {
    const attributeIds = [1, 5];
    const foodUnitAttribute = mockAttributes[2];
    const { categoryAttributes } = resolveCategoryAttributes(mockStrippedCategories[3], attributeIds, foodUnitAttribute, mockStrippedCategories, mockAttributes);
    const value = mockStrippedCategories[3].attributes[2].value/1000*mockStrippedCategories[3].attributes[1].value;
    expect(categoryAttributes[0].value).toEqual(value);
    expect(categoryAttributes[0].attribute).toBe(mockAttributes[0]);
  });

  it('should resolve category attributes by contributions with food unit attribute', () => {
    const attributeIds = [1, 5];
    const foodUnitAttribute = mockAttributes[2];
    const { categoryAttributes, measure } = resolveCategoryAttributes(mockStrippedCategories[0], attributeIds, foodUnitAttribute, mockStrippedCategories, mockAttributes);
    expect(categoryAttributes[0].attribute).toBe(mockAttributes[0]);
    console.log(categoryAttributes, measure);
  });
});
