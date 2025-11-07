# NFTs By Owner

GET https://base-mainnet.g.alchemy.com/nft/v3/{apiKey}/getNFTsForOwner

getNFTsForOwner - Retrieves all NFTs currently owned by a specified address. This endpoint is supported on Ethereum and many L2s, including Polygon, Arbitrum, Optimism, Base, World Chain and more. See the full list of supported networks [here](https://dashboard.alchemy.com/chains).

Reference: https://alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-nf-ts-for-owner-v-3

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: NFTs By Owner
  version: endpoint_nftOwnershipEndpoints.getNFTsForOwner-v3
paths:
  /v3/{apiKey}/getNFTsForOwner:
    get:
      operationId: get-nf-ts-for-owner-v-3
      summary: NFTs By Owner
      description: >-
        getNFTsForOwner - Retrieves all NFTs currently owned by a specified
        address. This endpoint is supported on Ethereum and many L2s, including
        Polygon, Arbitrum, Optimism, Base, World Chain and more. See the full
        list of supported networks [here](https://dashboard.alchemy.com/chains).
      tags:
        - - subpackage_nftOwnershipEndpoints
      parameters:
        - name: apiKey
          in: path
          required: true
          schema:
            type: string
        - name: owner
          in: query
          description: >-
            String - Address for NFT owner (can be in ENS format for Eth
            Mainnet).
          required: true
          schema:
            type: string
        - name: contractAddresses[]
          in: query
          description: >-
            Array of contract addresses to filter the responses with. Max limit
            45 contracts.
          required: false
          schema:
            type: array
            items:
              type: string
        - name: withMetadata
          in: query
          description: >-
            Boolean - if set to `true`, returns NFT metadata. Setting this to
            false will reduce payload size and may result in a faster API call.
            Defaults to `true`.
          required: false
          schema:
            type: boolean
        - name: orderBy
          in: query
          description: >-
            Enum - ordering scheme to use for ordering NFTs in the response. If
            unspecified, NFTs will be ordered by contract address and token ID.
              - transferTime: NFTs will be ordered by the time they were transferred into the wallet, with newest NFTs first. NOTE: this ordering is only supported on Ethereum Mainnet and Polygon Mainnet.
          required: false
          schema:
            $ref: '#/components/schemas/V3ApiKeyGetNfTsForOwnerGetParametersOrderBy'
        - name: excludeFilters[]
          in: query
          description: >-
            Array of filters (as ENUMS) that will be applied to the query. NFTs
            that match one or more of these filters will be excluded from the
            response. May not be used in conjunction with includeFilters[].
            Filter Options:
              - SPAM: NFTs that have been classified as spam. Spam classification has a wide range of criteria that includes but is not limited to emitting fake events and copying other well-known NFTs. Please note that this filter is currently supported on Mainnet for Base, Arbitrum, Optimism, Ethereum, Polygon, Worldchain, Avax, Gnosis, Zksync, and Blast, and is **available exclusively on paid tiers**.
              - AIRDROPS: NFTs that have were airdropped to the user. Airdrops are defined as NFTs that were minted to a user address in a transaction sent by a different address. NOTE: this filter is currently supported on Ethereum Mainnet, Ethereum Goerli, and Matic Mainnet only.
              - To learn more about spam, you can refer to this: <span class="custom-style"><a href="https://www.alchemy.com/overviews/spam-nfts" target="_blank">Spam NFTs and how to fix them</a></span>
          required: false
          schema:
            type: array
            items:
              $ref: >-
                #/components/schemas/V3ApiKeyGetNfTsForOwnerGetParametersExcludeFiltersSchemaItems
        - name: includeFilters[]
          in: query
          description: >-
            Array of filters (as ENUMS) that will be applied to the query. Only
            NFTs that match one or more of these filters will be included in the
            response. May not be used in conjunction with excludeFilters[].
            Filter Options:
              - SPAM: NFTs that have been classified as spam. Spam classification has a wide range of criteria that includes but is not limited to emitting fake events and copying other well-known NFTs. Please note that this filter is currently supported on Mainnet for Base, Arbitrum, Optimism, Ethereum, Polygon, Worldchain, Avax, Gnosis, Zksync, and Blast, and is **available exclusively on paid tiers**.
              - AIRDROPS: NFTs that have were airdropped to the user. Airdrops are defined as NFTs that were minted to a user address in a transaction sent by a different address. NOTE: this filter is currently supported on Ethereum Mainnet, Ethereum Goerli, and Matic Mainnet only.
              - To learn more about spam, you can refer to this: <span class="custom-style"><a href="https://www.alchemy.com/overviews/spam-nfts" target="_blank">Spam NFTs and how to fix them</a></span>
          required: false
          schema:
            type: array
            items:
              $ref: >-
                #/components/schemas/V3ApiKeyGetNfTsForOwnerGetParametersIncludeFiltersSchemaItems
        - name: spamConfidenceLevel
          in: query
          description: >-
            Enum - the confidence level at which to filter spam at.


            Confidence Levels:
              - VERY_HIGH
              - HIGH
              - MEDIUM
              - LOW

            The confidence level set means that any spam that is at that
            confidence level or higher will be filtered out. For example, if the
            confidence level is HIGH, contracts that we have HIGH or VERY_HIGH
            confidence in being spam will be filtered out from the response. 

            Defaults to VERY_HIGH for Ethereum Mainnet and MEDIUM for Matic
            Mainnet.


            **Please note that this filter is only available on paid tiers.
            Upgrade your account
            [here](https://dashboard.alchemyapi.io/settings/billing/).**
          required: false
          schema:
            $ref: >-
              #/components/schemas/V3ApiKeyGetNfTsForOwnerGetParametersSpamConfidenceLevel
        - name: tokenUriTimeoutInMs
          in: query
          description: >-
            No set timeout by default - When metadata is requested, this
            parameter is the timeout (in milliseconds) for the website hosting
            the metadata to respond. If you want to _only_ access the cache and
            not live fetch any metadata for cache misses then set this value to
            0.
          required: false
          schema:
            type: integer
        - name: pageKey
          in: query
          description: >-
            String - key for pagination. If more results are available, a
            pageKey will be returned in the response. Pass back the pageKey as a
            param to fetch the next page of results.
          required: false
          schema:
            type: string
        - name: pageSize
          in: query
          description: Number of NFTs to be returned per page. Defaults to 100. Max is 100.
          required: false
          schema:
            type: integer
      responses:
        '200':
          description: >-
            Returns the list of all NFTs owned by the given address and
            satisfying the given input parameters.
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/NFT Ownership
                  Endpoints_getNFTsForOwner-v3_Response_200
components:
  schemas:
    V3ApiKeyGetNfTsForOwnerGetParametersOrderBy:
      type: string
      enum:
        - value: transferTime
    V3ApiKeyGetNfTsForOwnerGetParametersExcludeFiltersSchemaItems:
      type: string
      enum:
        - value: SPAM
        - value: AIRDROPS
    V3ApiKeyGetNfTsForOwnerGetParametersIncludeFiltersSchemaItems:
      type: string
      enum:
        - value: SPAM
        - value: AIRDROPS
    V3ApiKeyGetNfTsForOwnerGetParametersSpamConfidenceLevel:
      type: string
      enum:
        - value: VERY_HIGH
        - value: HIGH
        - value: MEDIUM
        - value: LOW
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsContractTokenType:
      type: string
      enum:
        - value: ERC721
        - value: ERC1155
        - value: NO_SUPPORTED_NFT_STANDARD
        - value: NOT_A_CONTRACT
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsContractOpenseaMetadata:
      type: object
      properties:
        floorPrice:
          type: number
          format: double
        collectionName:
          type: string
        safelistRequestStatus:
          type: string
        imageUrl:
          type: string
        description:
          type: string
        externalUrl:
          type: string
        twitterUsername:
          type: string
        discordUrl:
          type: string
        bannerImageUrl:
          type: string
        lastIngestedAt:
          type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsContract:
      type: object
      properties:
        address:
          type: string
        name:
          type: string
        symbol:
          type: string
        totalSupply:
          type: string
        tokenType:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsContractTokenType
        contractDeployer:
          type: string
        deployedBlockNumber:
          type: number
          format: double
        openseaMetadata:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsContractOpenseaMetadata
        isSpam:
          type: string
        spamClassifications:
          type: array
          items:
            type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsImage:
      type: object
      properties:
        cachedUrl:
          type: string
        thumbnailUrl:
          type: string
        pngUrl:
          type: string
        contentType:
          type: string
        size:
          type: integer
        originalUrl:
          type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsRawMetadataAttributesItems:
      type: object
      properties:
        value:
          type: string
        trait_type:
          type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsRawMetadata:
      type: object
      properties:
        image:
          type: string
        name:
          type: string
        description:
          type: string
        attributes:
          type: array
          items:
            $ref: >-
              #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsRawMetadataAttributesItems
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsRaw:
      type: object
      properties:
        tokenUri:
          type: string
        metadata:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsRawMetadata
        error:
          type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsCollection:
      type: object
      properties:
        name:
          type: string
        slug:
          type: string
        externalUrl:
          type: string
        bannerImageUrl:
          type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsAcquiredAt:
      type: object
      properties:
        blockTimestamp:
          type: string
        blockNumber:
          type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsAnimation:
      type: object
      properties:
        cachedUrl:
          type: string
        contentType:
          type: string
        size:
          type: integer
        orginalUrl:
          type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsMint:
      type: object
      properties:
        mintAddress:
          type: string
        blockNumber:
          type: integer
        timestamp:
          type: string
        transactionHash:
          type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItems:
      type: object
      properties:
        contract:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsContract
        tokenId:
          type: string
        tokenType:
          type: string
        name:
          type: string
        description:
          type: string
        image:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsImage
        raw:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsRaw
        collection:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsCollection
        tokenUri:
          type: string
        timeLastUpdated:
          type: string
        acquiredAt:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsAcquiredAt
        animation:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsAnimation
        mint:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItemsMint
        owners:
          type: array
          items:
            type: string
    V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaValidAt:
      type: object
      properties:
        blockNumber:
          type: integer
        blockHash:
          type: string
        blockTimestamp:
          type: string
    NFT Ownership Endpoints_getNFTsForOwner-v3_Response_200:
      type: object
      properties:
        ownedNfts:
          type: array
          items:
            $ref: >-
              #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaOwnedNftsItems
        totalCount:
          type: integer
        pageKey:
          type: string
        validAt:
          $ref: >-
            #/components/schemas/V3ApiKeyGetNfTsForOwnerGetResponsesContentApplicationJsonSchemaValidAt

```

## SDK Code Examples

```python Response (By Default)
import requests

url = "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner"

querystring = {"owner":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

response = requests.get(url, params=querystring)

print(response.json())
```

```javascript Response (By Default)
const url = 'https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const options = {method: 'GET'};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go Response (By Default)
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

	req, _ := http.NewRequest("GET", url, nil)

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby Response (By Default)
require 'uri'
require 'net/http'

url = URI("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)

response = http.request(request)
puts response.read_body
```

```java Response (By Default)
HttpResponse<String> response = Unirest.get("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
  .asString();
```

```php Response (By Default)
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

echo $response->getBody();
```

```csharp Response (By Default)
var client = new RestClient("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
var request = new RestRequest(Method.GET);
IRestResponse response = client.Execute(request);
```

```swift Response (By Default)
import Foundation

let request = NSMutableURLRequest(url: NSURL(string: "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

```python Response (withMetadata = false)
import requests

url = "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner"

querystring = {"owner":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

response = requests.get(url, params=querystring)

print(response.json())
```

```javascript Response (withMetadata = false)
const url = 'https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const options = {method: 'GET'};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go Response (withMetadata = false)
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

	req, _ := http.NewRequest("GET", url, nil)

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby Response (withMetadata = false)
require 'uri'
require 'net/http'

url = URI("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)

response = http.request(request)
puts response.read_body
```

```java Response (withMetadata = false)
HttpResponse<String> response = Unirest.get("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
  .asString();
```

```php Response (withMetadata = false)
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

echo $response->getBody();
```

```csharp Response (withMetadata = false)
var client = new RestClient("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
var request = new RestRequest(Method.GET);
IRestResponse response = client.Execute(request);
```

```swift Response (withMetadata = false)
import Foundation

let request = NSMutableURLRequest(url: NSURL(string: "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

```python Response (with contract filtering)
import requests

url = "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner"

querystring = {"owner":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

response = requests.get(url, params=querystring)

print(response.json())
```

```javascript Response (with contract filtering)
const url = 'https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const options = {method: 'GET'};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go Response (with contract filtering)
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

	req, _ := http.NewRequest("GET", url, nil)

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby Response (with contract filtering)
require 'uri'
require 'net/http'

url = URI("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)

response = http.request(request)
puts response.read_body
```

```java Response (with contract filtering)
HttpResponse<String> response = Unirest.get("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
  .asString();
```

```php Response (with contract filtering)
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

echo $response->getBody();
```

```csharp Response (with contract filtering)
var client = new RestClient("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
var request = new RestRequest(Method.GET);
IRestResponse response = client.Execute(request);
```

```swift Response (with contract filtering)
import Foundation

let request = NSMutableURLRequest(url: NSURL(string: "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

```python Response (with pagination)
import requests

url = "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner"

querystring = {"owner":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}

response = requests.get(url, params=querystring)

print(response.json())
```

```javascript Response (with pagination)
const url = 'https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const options = {method: 'GET'};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go Response (with pagination)
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

	req, _ := http.NewRequest("GET", url, nil)

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby Response (with pagination)
require 'uri'
require 'net/http'

url = URI("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)

response = http.request(request)
puts response.read_body
```

```java Response (with pagination)
HttpResponse<String> response = Unirest.get("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
  .asString();
```

```php Response (with pagination)
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

echo $response->getBody();
```

```csharp Response (with pagination)
var client = new RestClient("https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
var request = new RestRequest(Method.GET);
IRestResponse response = client.Execute(request);
```

```swift Response (with pagination)
import Foundation

let request = NSMutableURLRequest(url: NSURL(string: "https://base-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```