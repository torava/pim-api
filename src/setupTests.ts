import { AttributeShape } from "./models/Attribute";
import { CategoryShape } from "./models/Category";
import { ProductShape } from "./models/Product";

export const toArrayBuffer = (buffer: Buffer) => {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
  }
  return arrayBuffer;
};

export const mockCategoryChildren: CategoryShape[] = [
  {
    id: 302,
    name: {
      'en-US': 'Macaroni, dark, boiled without salt',
      'fi-FI': 'Makaroni, tumma, keitetty, suolaton',
      'sv-SE': 'Makaroner, mörka, kokta utan salt'
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
      "sv-SE": "Makaroner, mörka"
    },
    "aliases": null,
    "parentId": 50,
    "contributions": [],
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
      "sv-SE": "Vatten, kranvatten"
    },
    "aliases": null,
    "parentId": 127,
    "contributions": [],
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
      "sv-SE": "Läskedryck"
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
    ]
  },
  {
    "id": 945,
    "name": {
      "en-US": "Ravioli with spinach filling, boiled",
      "fi-FI": "Pasta, täytepasta, ravioli, pinaattitäyte, keitetty",
      "sv-SE": "Pasta, fylld pasta, ravioli med spenatfyllning"
    },
    "aliases": [
      "de Angelis tortell"
    ],
    "parentId": 51,
    "contributions": [
      {
        "id": 974,
        "amount": 0.8,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 254
      },
      {
        "id": 968,
        "amount": 38,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 280
      },
      {
        "id": 973,
        "amount": 3,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 471
      },
      {
        "id": 972,
        "amount": 4,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 551
      },
      {
        "id": 970,
        "amount": 12,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 650
      },
      {
        "id": 969,
        "amount": 20,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 679
      },
      {
        "id": 975,
        "amount": 0.8,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 1511
      },
      {
        "id": 971,
        "amount": 10,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 1523
      },
      {
        "id": 976,
        "amount": 0.05,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 1533
      },
      {
        "id": 977,
        "amount": 12,
        "unit": "g",
        "categoryId": 945,
        "contributionId": 3596
      }
    ],
    "attributes": [
      {
        "id": 47939,
        "value": 886.52,
        "unit": "kj/hg",
        "type": null,
        "categoryId": 945,
        "attributeId": 5
      },
      {
        "id": 311267,
        "value": 175,
        "unit": "g",
        "type": null,
        "categoryId": 945,
        "attributeId": 117
      },
      {
        "id": 328194,
        "value": 0.7,
        "unit": "kgCO₂e/EUR",
        "type": null,
        "categoryId": 945,
        "attributeId": 1
      }
    ]
  },
  {
    "id": 3592,
    "name": {
      "en-US": "Cheese, average",
      "fi-FI": "Juusto, tuotekeskiarvo",
      "sv-SE": "Ost, medelvärde"
    },
    "aliases": [
      "Juusto",
      "Juustoa"
    ],
    "parentId": 98,
    "contributions": [],
    "attributes": [
      {
        "id": 244781,
        "value": 1159.37,
        "unit": "kj/hg",
        "type": null,
        "categoryId": 3592,
        "attributeId": 5
      },
      {
        "id": 323609,
        "value": 8,
        "unit": "g",
        "type": null,
        "categoryId": 3592,
        "attributeId": 117
      }
    ]
  },
  {
    "id": 3776,
    "name": {
      "en-US": "Cream sauce with meat bouillon",
      "fi-FI": "Kermakastike, lihaliemi, kerma, vehnäjauho",
      "sv-SE": "Gräddsås, köttbuljong, grädde, vetemjöl"
    },
    "aliases": [
      "Creamy sauce"
    ],
    "parentId": 45,
    "contributions": [
      {
        "id": 8698,
        "amount": 400,
        "unit": "g",
        "categoryId": 3776,
        "contributionId": 253
      },
      {
        "id": 8701,
        "amount": 5,
        "unit": "g",
        "categoryId": 3776,
        "contributionId": 254
      },
      {
        "id": 8702,
        "amount": 30,
        "unit": "g",
        "categoryId": 3776,
        "contributionId": 280
      },
      {
        "id": 8699,
        "amount": 30,
        "unit": "g",
        "categoryId": 3776,
        "contributionId": 1118
      },
      {
        "id": 8700,
        "amount": 100,
        "unit": "g",
        "categoryId": 3776,
        "contributionId": 1752
      }
    ],
    "attributes": [
      {
        "id": 258055,
        "value": 574.77,
        "unit": "kj/hg",
        "type": null,
        "categoryId": 3776,
        "attributeId": 5
      },
      {
        "id": 324513,
        "value": 100,
        "unit": "g",
        "type": null,
        "categoryId": 3776,
        "attributeId": 117
      }
    ]
  }
];

export const mockCategories: CategoryShape[] = [
  ...mockCategoryChildren,
  {
    "id": 50,
    "name": {
      "en-US": "Wheat",
      "fi-FI": "Vehnä",
      "sv-SE": "Vete"
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
      "sv-SE": "Vatten"
    },
    "aliases": null,
    "parentId": 20,
    "contributions": [],
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
  },
  {
    "id": 98,
    "name": {
      "en-US": "Cheese, ripened cheese > 17 %",
      "fi-FI": "Juustot, kypsytetyt, rasvaa >17 %",
      "sv-SE": "Ost, mogen > 17 %"
    },
    "aliases": null,
    "parentId": 16,
    "contributions": [],
    "attributes": [
      {
        "id": 327931,
        "value": 8.55,
        "unit": "kgCO₂e/kg",
        "type": null,
        "categoryId": 98,
        "attributeId": 1
      },
      {
        "id": 327932,
        "value": 10,
        "unit": "kgCO₂e/kg",
        "type": null,
        "categoryId": 98,
        "attributeId": 1
      },
      {
        "id": 327933,
        "value": 2.44,
        "unit": "kgCO₂e/EUR",
        "type": null,
        "categoryId": 98,
        "attributeId": 1
      }
    ]
  }
];

export const mockAttributes: AttributeShape[] = [
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
      "sv-SE": "Energi, beräknad"
    },
    "parentId": 4
  },
  {
    "id": 117,
    "code": "PORTM",
    "name": {
      "en-US": "medium-sized portion",
      "fi-FI": "keskikokoinen annos",
      "sv-SE": "medelstor portion"
    },
    "parentId": 2
  }
];

export const mockProducts: ProductShape[] = [
  {
    name: 'Coca-Cola Coca-cola',
    contributionList: null,
    contributions: [],
    category: undefined,
    id: 574,
    productNumber: null,
    aliases: null,
    quantity: 1,
    measure: 2,
    unit: 'l',
    manufacturerId: null,
    categoryId: 670
  },
  {
    id: 1,
    "name": "Macaroni dark",
    "contributionList": "Macaroni dark",
    contributions: [
      {
        id: 1,
        contributionId: 302
      }
    ],
    categoryId: 296
  }
];
