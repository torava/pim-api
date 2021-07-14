import { mockStrippedCategoryChildren } from "../setupTests";
import { getContributionsFromList } from "./categories";

it('should get contributions', () => {
  const contributions = getContributionsFromList('Macaroni dark 500g', undefined, mockStrippedCategoryChildren);
  console.log(contributions);
  expect(contributions.length).toBe(1);
  expect(contributions[0].contributionId).toBe(302);
  expect(contributions[0].contribution.amount).toBe(500);
  expect(contributions[0].contribution.unit).toBe('g');
});
