// The walkthrough's material catalogue: a selection of the real PoC's
// (demo/proof-of-concept-v3/src/data/materials), same rows, so the swatches and
// the house look like the real thing. Generated from those files; \`particles\`
// is the particle wall's reading of each one: [density, organic, round dots,
// movement, transparency].

export const ROWS = [
  {
    "id": "marble",
    "name": "Marble",
    "categories": [
      "stone"
    ],
    "family": "veined",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#e9e7e3",
    "roughness": 0.25,
    "metalness": 0,
    "clearcoat": 0.3,
    "bump": 0.2,
    "params": {
      "vein": "#8e9097",
      "veins": 7,
      "joints": [
        2,
        2
      ]
    },
    "particles": [
      0.95,
      0.5,
      true,
      "still",
      0.1
    ]
  },
  {
    "id": "granite",
    "name": "Granite",
    "categories": [
      "stone"
    ],
    "family": "granular",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#8a8682",
    "roughness": 0.35,
    "metalness": 0,
    "clearcoat": 0.2,
    "bump": 0.3,
    "params": {
      "crystals": [
        "#2b2a29",
        "#d9d4cc",
        "#b88f80",
        "#6d6a66"
      ],
      "joints": [
        2,
        2
      ]
    },
    "particles": [
      0.95,
      0.2,
      false,
      "still",
      0
    ]
  },
  {
    "id": "terrazzo",
    "name": "Terrazzo",
    "categories": [
      "stone",
      "concrete"
    ],
    "family": "terrazzo",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1,
    "color": "#e9e3d9",
    "roughness": 0.4,
    "metalness": 0,
    "clearcoat": 0.4,
    "bump": 0.3,
    "params": {},
    "particles": [
      0.8,
      0.3,
      false,
      "still",
      0
    ]
  },
  {
    "id": "slate",
    "name": "Slate",
    "categories": [
      "stone"
    ],
    "family": "cleft",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#3d4246",
    "roughness": 0.7,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 1.4,
    "params": {
      "joints": [
        3,
        4
      ]
    },
    "particles": [
      0.85,
      0.15,
      false,
      "rhythm",
      0
    ]
  },
  {
    "id": "travertine",
    "name": "Travertine",
    "categories": [
      "stone"
    ],
    "family": "sediment",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#d8c3a2",
    "roughness": 0.6,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 1.2,
    "params": {
      "layers": 0.8,
      "pores": 1.2,
      "elongated": true,
      "joints": [
        2,
        2
      ]
    },
    "particles": [
      0.7,
      0.45,
      true,
      "still",
      0
    ]
  },
  {
    "id": "oak",
    "name": "Oak",
    "categories": [
      "wood"
    ],
    "family": "planks",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#b8946c",
    "roughness": 0.6,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 1.2,
    "params": {
      "grain": 1
    },
    "particles": [
      0.7,
      0.7,
      true,
      "flow",
      0
    ]
  },
  {
    "id": "walnut",
    "name": "Walnut",
    "categories": [
      "wood"
    ],
    "family": "planks",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#6b4a33",
    "roughness": 0.6,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 1.2,
    "params": {
      "grain": 1.1,
      "streaks": 0.3
    },
    "particles": [
      0.75,
      0.7,
      true,
      "flow",
      0
    ]
  },
  {
    "id": "larch",
    "name": "Larch",
    "categories": [
      "wood"
    ],
    "family": "planks",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#c78b57",
    "roughness": 0.6,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 1.2,
    "params": {
      "grain": 1.3,
      "knots": 0.6
    },
    "particles": [
      0.65,
      0.75,
      true,
      "flow",
      0
    ]
  },
  {
    "id": "bamboo",
    "name": "Bamboo",
    "categories": [
      "wood",
      "natural"
    ],
    "family": "bamboo",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1,
    "color": "#d6b47a",
    "roughness": 0.6,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 1.2,
    "params": {},
    "particles": [
      0.6,
      0.6,
      true,
      "rhythm",
      0
    ]
  },
  {
    "id": "cork",
    "name": "Cork",
    "categories": [
      "wood",
      "natural"
    ],
    "family": "cork",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 0.6,
    "color": "#b98a5e",
    "roughness": 0.9,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 2,
    "params": {},
    "particles": [
      0.45,
      0.7,
      true,
      "disperse",
      0
    ]
  },
  {
    "id": "clt",
    "name": "Cross-laminated timber (CLT)",
    "categories": [
      "wood"
    ],
    "family": "lamella",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 2.4,
    "color": "#d9bb8c",
    "roughness": 0.6,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 1.2,
    "params": {
      "lamellas": 6
    },
    "particles": [
      0.8,
      0.4,
      false,
      "rhythm",
      0
    ]
  },
  {
    "id": "concrete",
    "name": "Exposed concrete",
    "categories": [
      "concrete"
    ],
    "family": "concrete",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#aeaba5",
    "roughness": 0.85,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 1.5,
    "params": {},
    "particles": [
      0.95,
      0.2,
      false,
      "still",
      0
    ]
  },
  {
    "id": "polished-concrete",
    "name": "Polished concrete",
    "categories": [
      "concrete"
    ],
    "family": "concrete",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#a8a49d",
    "roughness": 0.2,
    "metalness": 0,
    "clearcoat": 0.6,
    "bump": 0.2,
    "params": {
      "holes": false,
      "seams": false,
      "speckle": 0.5,
      "aggregate": [
        "#6b665f",
        "#d8d2c8",
        "#8a8178"
      ]
    },
    "particles": [
      0.95,
      0.25,
      true,
      "flow",
      0
    ]
  },
  {
    "id": "textured-concrete",
    "name": "Textured concrete",
    "categories": [
      "concrete"
    ],
    "family": "planks",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.4,
    "color": "#9e9b95",
    "roughness": 0.8,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 2,
    "params": {
      "boards": 7,
      "grain": 2.2,
      "variance": 1.5
    },
    "particles": [
      0.9,
      0.35,
      false,
      "rhythm",
      0
    ]
  },
  {
    "id": "recycled-concrete",
    "name": "Recycled concrete",
    "categories": [
      "concrete"
    ],
    "family": "terrazzo",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#a7a39c",
    "roughness": 0.7,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 0.8,
    "params": {
      "chips": [
        "#8b4a3a",
        "#6f6a64",
        "#c9c3b8",
        "#9a5040",
        "#55524e"
      ],
      "count": 700,
      "size": 16
    },
    "particles": [
      0.75,
      0.3,
      false,
      "disperse",
      0
    ]
  },
  {
    "id": "copper",
    "name": "Copper",
    "categories": [
      "metals"
    ],
    "family": "metal",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 2,
    "color": "#c27a4f",
    "roughness": 0.3,
    "metalness": 1,
    "clearcoat": 0,
    "bump": 0.3,
    "params": {
      "joints": [
        4,
        1
      ]
    },
    "particles": [
      0.9,
      0.3,
      true,
      "flow",
      0.1
    ]
  },
  {
    "id": "stainless-steel",
    "name": "Stainless steel",
    "categories": [
      "metals"
    ],
    "family": "metal",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.2,
    "color": "#c3c6c9",
    "roughness": 0.3,
    "metalness": 1,
    "clearcoat": 0,
    "bump": 0.3,
    "params": {
      "brushed": 1
    },
    "particles": [
      1,
      0,
      false,
      "still",
      0
    ]
  },
  {
    "id": "corten-steel",
    "name": "Corten steel",
    "categories": [
      "metals"
    ],
    "family": "rust",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 1.8,
    "color": "#6e3a22",
    "roughness": 0.9,
    "metalness": 0.15,
    "clearcoat": 0,
    "bump": 1,
    "params": {
      "runs": 0.6,
      "joints": [
        2,
        3
      ]
    },
    "particles": [
      0.85,
      0.35,
      false,
      "disperse",
      0
    ]
  },
  {
    "id": "zinc",
    "name": "Zinc",
    "categories": [
      "metals"
    ],
    "family": "metal",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 2,
    "color": "#9ea4a8",
    "roughness": 0.55,
    "metalness": 1,
    "clearcoat": 0,
    "bump": 0.3,
    "params": {
      "clouds": 1.5,
      "patina": "#b9c0c3",
      "amount": 0.4,
      "joints": [
        4,
        1
      ]
    },
    "particles": [
      0.9,
      0.1,
      false,
      "rhythm",
      0
    ]
  },
  {
    "id": "glass",
    "name": "Glass",
    "categories": [
      "glass"
    ],
    "family": "glass",
    "surfaces": [
      "wall"
    ],
    "through": true,
    "tile": 1,
    "color": "#dbeef0",
    "roughness": 0.04,
    "metalness": 0,
    "clearcoat": 0,
    "bump": 0,
    "params": {
      "transmission": 1,
      "thickness": 0.15,
      "ior": 1.5
    },
    "particles": [
      0.35,
      0.2,
      true,
      "flow",
      0.8
    ]
  },
  {
    "id": "tiles",
    "name": "Ceramic tiles",
    "categories": [
      "ceramics"
    ],
    "family": "tiles",
    "surfaces": [
      "wall",
      "floor"
    ],
    "tile": 0.8,
    "color": "#efece6",
    "roughness": 0.35,
    "metalness": 0,
    "clearcoat": 0.6,
    "bump": 1.5,
    "params": {},
    "particles": [
      0.8,
      0.05,
      false,
      "rhythm",
      0
    ]
  }
];
