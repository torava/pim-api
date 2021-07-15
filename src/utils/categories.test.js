import { mockStrippedCategoryChildren } from "../setupTests";
import { getContributionsFromList, getTokensFromContributionList } from "./categories";

it('should get tokens from contribution list', () => {
  expect(getTokensFromContributionList('Macaroni dark 500g [macaroni] (10%) and water (90%)')).toEqual(['Macaroni dark 500g', 'water']);
});

it('should get contributions', () => {
  const contributions = getContributionsFromList('Macaroni dark 500g [macaroni] (100%)', undefined, mockStrippedCategoryChildren);
  expect(contributions.length).toBe(1);
  expect(contributions[0].contributionId).toBe(302);
  expect(contributions[0].contribution.amount).toBe(500);
  expect(contributions[0].contribution.unit).toBe('g');
});
