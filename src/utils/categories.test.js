import { getContributionsFromList } from "./categories";

it('should get contributions', () => {
  const strippedCategories = [
    {
      id: 302,
      name: {
        'en-US': 'Macaroni, dark, boiled without salt',
        'fi-FI': 'Makaroni, tumma, keitetty, suolaton',
        'sv-SV': 'Makaroner, mörka, kokta utan salt'
      },
      aliases: null,
      parentId: 51,
      contributions: [
        {
          id: 4,
          amount: 30,
          unit: 'g',
          categoryId: 302,
          contributionId: 296
        },
        {
          id: 3,
          amount: 70,
          unit: 'g',
          categoryId: 302,
          contributionId: 679
        }
      ],
      children: [],
      strippedName: {
        'en-US': 'Macaroni dark',
        'fi-FI': 'Makaroni tumma',
        'sv-SV': 'Makaroner mörka kokta utan salt'
      }
    },
    {
      "id": 296,
      "name": {
        "en-US": "Macaroni, whole wheat",
        "fi-FI": "Makaroni, tumma",
        "sv-SV": "Makaroner, mörka"
      },
      "aliases": null,
      "parentId": 50,
      "contributions": [],
      strippedName: {
        'en-US': 'Macaroni whole wheat',
        'fi-FI': 'Makaroni tumma',
        'sv-SV': 'Makaroner mörka'
      }
    },
    {
      "id": 679,
      "name": {
        "en-US": "Water, tap water",
        "fi-FI": "Vesi, vesijohtovesi",
        "sv-SV": "Vatten, kranvatten"
      },
      "aliases": null,
      "parentId": 127,
      "contributions": [],
      "strippedName": {
        "en-US": "Water tap water",
        "fi-FI": "Vesi vesijohtovesi",
        "sv-SV": "Vatten kranvatten"
      },
    }
  ];
  const contributions = getContributionsFromList('Macaroni dark', undefined, strippedCategories);
  expect(contributions.length).toBe(1);
  expect(contributions[0].contributionId).toBe(302);
});
