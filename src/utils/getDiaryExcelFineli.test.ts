import { compareAttributeToRecommendation, getDailyAttributeValue } from './getDiaryExcelFineli';
import { mockAttributes, mockRecommendations } from '../setupTests';

describe('get daily attribute value', () => {
  it('should return daily attribute value', () => {
    expect(
      getDailyAttributeValue(400.387196906781, 11946.8472469565, 2254, mockRecommendations[0], mockAttributes[3])
    ).toEqual(56.97387944044633);
  });
});

describe('compare attribute to recommendation', () => {
  it('should return true if attribute value is within recommendations', () => {
    expect(compareAttributeToRecommendation(56.97387944044633, mockRecommendations[0])).toBeTruthy();
  });
});
