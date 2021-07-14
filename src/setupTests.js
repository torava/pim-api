import '@testing-library/jest-dom/extend-expect';

export const toArrayBuffer = (buf) => {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
  }
  return ab;
};

export const mockStrippedCategoryChildren = [
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
    },
    "attributes": [
      {
        "id": 4117,
        "value": 445.83,
        "unit": "kj/hg",
        "type": null,
        "categoryId": 291,
        "attributeId": 5
      },
      {
        "id": 308120,
        "value": 175,
        "unit": "g",
        "type": null,
        "categoryId": 291,
        "attributeId": 117
      }
    ]
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
    },
    "attributes": [
      {
        "id": 3903,
        "value": 1486.1,
        "unit": "kj/hg",
        "type": null,
        "categoryId": 288,
        "attributeId": 5
      },
      {
        "id": 308108,
        "value": 70,
        "unit": "g",
        "type": null,
        "categoryId": 288,
        "attributeId": 117
      }
    ]
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
    "attributes": [
      {
        "id": 32003,
        "value": 0,
        "unit": "kj/hg",
        "type": null,
        "categoryId": 679,
        "attributeId": 5
      },
      {
        "id": 310068,
        "value": 300,
        "unit": "g",
        "type": null,
        "categoryId": 679,
        "attributeId": 117
      }
    ]
  },
  {
    "id": 670,
    "name": {
      "en-US": "Soft drink, lemonade",
      "fi-FI": "Virvoitusjuoma",
      "sv-SV": "Läskedryck"
    },
    "aliases": [
      "Coca-Cola",
      "Pepsi",
      "Fanta",
      "Sprite",
      "7up",
      "Jaffa"
    ],
    "parentId": 124,
    "attributes": [
      {
        "id": 31372,
        "value": 155.72,
        "unit": "kj/hg",
        "type": null,
        "categoryId": 670,
        "attributeId": 5
      },
      {
        "id": 328241,
        "value": 0.2,
        "unit": "kgCO₂e/l",
        "type": null,
        "categoryId": 670,
        "attributeId": 1
      },
      {
        "id": 310017,
        "value": 400,
        "unit": "g",
        "type": null,
        "categoryId": 670,
        "attributeId": 117
      }
    ],
    "strippedName": {
      "en-US": "Soft drink lemonade",
      "fi-FI": "Virvoitusjuoma",
      "sv-SV": "Läskedryck"
    }
  }
];

export const mockStrippedCategories = [
  ...mockStrippedCategoryChildren,
  {
    "id": 50,
    "name": {
      "en-US": "Wheat",
      "fi-FI": "Vehnä",
      "sv-SV": "Vete"
    },
    "aliases": null,
    "parentId": 6,
    "contributions": [],
    "attributes": [
      {
        "id": 328294,
        "value": 0.5,
        "unit": "kgCO₂e/kg",
        "type": null,
        "categoryId": 50,
        "attributeId": 1
      },
      {
        "id": 328293,
        "value": 0.52,
        "unit": "kgCO₂e/kg",
        "type": null,
        "categoryId": 50,
        "attributeId": 1
      }
    ]
  },
  {
    "id": 127,
    "name": {
      "en-US": "Water",
      "fi-FI": "Vesi",
      "sv-SV": "Vatten"
    },
    "aliases": null,
    "parentId": 20,
    "contributions": [],
    "strippedName": {
      "en-US": "Water",
      "fi-FI": "Vesi",
      "sv-SV": "Vatten"
    },
    "attributes": [
      {
        "id": 328291,
        "value": 0.1,
        "unit": "kgCO₂e/l",
        "type": null,
        "categoryId": 127,
        "attributeId": 1
      }
    ]
  }
];

export const mockAttributes = [
  {
    "id": 1,
    "code": "GHG",
    "name": {
      "en-US": "GHG",
      "fi-FI": "KHK",
      "sv-SE": "VHG"
    },
    "parentId": null
  },
  {
    "id": 5,
    "code": "ENERC",
    "name": {
      "en-US": "Energy,calculated",
      "fi-FI": "Energia, laskennallinen",
      "sv-SV": "Energi, beräknad"
    },
    "parentId": 4
  },
  {
    "id": 117,
    "code": "PORTM",
    "name": {
      "en-US": "medium-sized portion",
      "fi-FI": "keskikokoinen annos",
      "sv-SV": "medelstor portion"
    },
    "parentId": 2
  }
];

export const mockProducts = [
  {
    name: 'Coca-Cola Coca-cola',
    contributionList: null,
    contributions: [],
    category: undefined,
    id: 574,
    product_number: null,
    aliases: null,
    quantity: 1,
    measure: 2,
    unit: 'l',
    manufacturerId: null,
    categoryId: 670
  },
  {
    "name": "Macaroni dark",
    "contributionList": "Macaroni dark",
    contributions: [
      {
        contributionId: 302
      }
    ],
    categoryId: 296
  }
];
