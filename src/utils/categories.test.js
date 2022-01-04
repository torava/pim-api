import { mockCategoryChildren } from "../setupTests";
import { getContributionsFromList, getStrippedCategories, getTokensFromContributionList } from "./categories";

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
    'sv-SV': 'Makaroner mörka kokta utan salt'
  });
  expect(strippedCategories[4].strippedName).toEqual({
    "en-US": "Ravioli spinach",
    "fi-FI": "Pasta ravioli pinaatti",
    "sv-SV": "Pasta fylld pasta ravioli med spenatfyllning"
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

