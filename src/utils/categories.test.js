import { mockStrippedCategoryChildren } from "../setupTests";
import { getContributionsFromList } from "./categories";

it('should get contributions', () => {
  const contributions = getContributionsFromList('Macaroni dark', undefined, mockStrippedCategoryChildren);
  expect(contributions.length).toBe(1);
  expect(contributions[0].contributionId).toBe(302);
});
