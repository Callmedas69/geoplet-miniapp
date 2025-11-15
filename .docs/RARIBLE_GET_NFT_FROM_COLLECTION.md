## FOR RECENT MINT / NFT GRID

BASE URL = https://api.rarible.org/v0.1/items/byCollection

# REQUEST
import rarible from '@api/rarible';

rarible.auth('11111111-1111-1111-1111-111111111111');
rarible.getItemsByCollection({collection: 'BASE%3A0x999aC3B6571fEfb770EA3A836E82Cc45Cd1e653F'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));


  # RESPONSE
  {
  "continuation": "1763135855755_BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f:1419696",
  "items": [
    {
      "id": "BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f:22420",
      "blockchain": "BASE",
      "collection": "BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f",
      "contract": "BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f",
      "tokenId": "22420",
      "creators": [
        {
          "account": "ETHEREUM:0xcc1867533640fe07a27b7353f8bfe94ad12a5440",
          "value": 10000
        }
      ],
      "ownerIfSingle": "ETHEREUM:0xdc41d6da6bb2d02b19316b2bfff0cbb42606484d",
      "ownerChangeDate": "2025-11-14T16:01:36.188Z",
      "lazySupply": "0",
      "pending": [],
      "mintedAt": "2025-11-14T08:34:59Z",
      "lastUpdatedAt": "2025-11-14T16:01:36.226Z",
      "supply": "1",
      "meta": {
        "name": "Geoplet #22420",
        "description": "Geoplet transforms pure geometry into living art, a dialogue between shape, color, and rhythm. Drawing inspiration from Bauhaus and Suprematism, each piece captures harmony through abstraction, expressing emotion within mathematical precision. Every Geoplet is born from code, crafted by algorithmic design, and preserved entirely on-chain, a timeless fusion of creativity, logic, and form.",
        "tags": [],
        "genres": [],
        "externalUri": "https://geoplet.geoart.studio",
        "originalMetaUri": "https://api.rarible.org/content/embedded/2d550b7c4804cb49fef5e16a6880beecd6235e0554fe5ac78293254ff42ac7d3",
        "attributes": [
          {
            "key": "Composition",
            "value": "Abstract"
          },
          {
            "key": "Palette",
            "value": "Pastel Minimalist"
          },
          {
            "key": "Primary Shape",
            "value": "Ellipse"
          },
          {
            "key": "Style",
            "value": "Suprematism"
          },
          {
            "key": "Symmetry",
            "value": "Bilateral"
          },
          {
            "key": "Background",
            "value": "Gradient"
          },
          {
            "key": "Complexity",
            "value": "5"
          },
          {
            "key": "Density",
            "value": "45"
          },
          {
            "key": "Elements",
            "value": "92"
          },
          {
            "key": "Rarity",
            "value": "Common"
          },
          {
            "key": "Creator",
            "value": "0xdas"
          }
        ],
        "content": [
          {
            "@type": "IMAGE",
            "url": "https://api.rarible.org/content/embedded/d333b123ea73051d61c17e3e41ef1bba80439f49b0cbad6e738dfbc3cb67b50f",
            "representation": "ORIGINAL",
            "mimeType": "image/webp",
            "size": 9654,
            "available": true,
            "width": 512,
            "height": 512
          }
        ],
        "extraContent": []
      },
      "deleted": false,
      "totalStock": "0",
      "sellers": 0,
      "suspicious": false,
      "itemCollection": {
        "id": "BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f",
        "name": "Geoplets"
      },
      "features": [],
      "rarity": {
        "score": 12,
        "rank": 1
      },
      "version": 12
    },
    {
      "id": "BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f:1419696",
      "blockchain": "BASE",
      "collection": "BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f",
      "contract": "BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f",
      "tokenId": "1419696",
      "creators": [
        {
          "account": "ETHEREUM:0xcc1867533640fe07a27b7353f8bfe94ad12a5440",
          "value": 10000
        }
      ],
      "ownerIfSingle": "ETHEREUM:0x678170b0f3ad9aa98b000494af32e4115a0f0f62",
      "ownerChangeDate": "2025-11-14T15:57:35.716Z",
      "lazySupply": "0",
      "pending": [],
      "mintedAt": "2025-11-14T09:51:57Z",
      "lastUpdatedAt": "2025-11-14T15:57:35.755Z",
      "supply": "1",
      "meta": {
        "name": "Geoplet #1419696",
        "description": "Geoplet transforms pure geometry into living art, a dialogue between shape, color, and rhythm. Drawing inspiration from Bauhaus and Suprematism, each piece captures harmony through abstraction, expressing emotion within mathematical precision. Every Geoplet is born from code, crafted by algorithmic design, and preserved entirely on-chain, a timeless fusion of creativity, logic, and form.",
        "tags": [],
        "genres": [],
        "externalUri": "https://geoplet.geoart.studio",
        "originalMetaUri": "https://api.rarible.org/content/embedded/dc60c6b2e18836578a2e1d2896367bd8caa819fc4858f3abc4ea579d53e6d946",
        "attributes": [
          {
            "key": "Composition",
            "value": "Grid"
          },
          {
            "key": "Palette",
            "value": "Neon Geometric"
          },
          {
            "key": "Primary Shape",
            "value": "Square"
          },
          {
            "key": "Style",
            "value": "Futurism"
          },
          {
            "key": "Symmetry",
            "value": "Translational"
          },
          {
            "key": "Background",
            "value": "Solid"
          },
          {
            "key": "Complexity",
            "value": "6"
          },
          {
            "key": "Density",
            "value": "25"
          },
          {
            "key": "Elements",
            "value": "84"
          },
          {
            "key": "Rarity",
            "value": "Uncommon"
          },
          {
            "key": "Creator",
            "value": "0xdas"
          }
        ],
        "content": [
          {
            "@type": "IMAGE",
            "url": "https://api.rarible.org/content/embedded/aa76309e20eea16a7f567c6cde6ee34f7f0d0be980c5f3ad04a8073e1c95c476",
            "representation": "ORIGINAL",
            "mimeType": "image/webp",
            "size": 8136,
            "available": true,
            "width": 512,
            "height": 512
          }
        ],
        "extraContent": []
      },
      "deleted": false,
      "totalStock": "0",
      "sellers": 0,
      "suspicious": false,
      "itemCollection": {
        "id": "BASE:0x999ac3b6571fefb770ea3a836e82cc45cd1e653f",
        "name": "Geoplets"
      },
      "features": [],
      "rarity": {
        "score": 6,
        "rank": 1
      },
      "version": 14
    }
  ]
}