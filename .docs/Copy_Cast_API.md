# Post a cast

> Posts a cast or cast reply. Works with mentions and embeds.  
(In order to post a cast `signer_uuid` must be approved)

## OpenAPI

````yaml post /v2/farcaster/cast/
paths:
  path: /v2/farcaster/cast/
  method: post
  servers:
    - url: https://api.neynar.com
  request:
    security:
      - title: ApiKeyAuth
        parameters:
          query: {}
          header:
            x-api-key:
              type: apiKey
              description: API key to authorize requests
              x-default: NEYNAR_API_DOCS
          cookie: {}
    parameters:
      path: {}
      query: {}
      header: {}
      cookie: {}
    body:
      application/json:
        schemaArray:
          - type: object
            properties:
              signer_uuid:
                allOf:
                  - $ref: '#/components/schemas/SignerUUID'
              text:
                allOf:
                  - type: string
              embeds:
                allOf:
                  - type: array
                    items:
                      $ref: '#/components/schemas/PostCastReqBodyEmbeds'
                    maxItems: 2
              parent:
                allOf:
                  - $ref: '#/components/schemas/CastParent'
              channel_id:
                allOf:
                  - type: string
                    description: >-
                      Channel ID of the channel where the cast is to be posted.
                      e.g. neynar, farcaster, warpcast
                    example: neynar
              idem:
                allOf:
                  - $ref: '#/components/schemas/Idem'
              parent_author_fid:
                allOf:
                  - $ref: '#/components/schemas/Fid'
            required: true
            title: PostCastReqBody
            refIdentifier: '#/components/schemas/PostCastReqBody'
            requiredProperties:
              - signer_uuid
        examples:
          example:
            value:
              signer_uuid: 19d0c5fd-9b33-4a48-a0e2-bc7b0555baec
              text: <string>
              embeds:
                - cast_id:
                    hash: <string>
                    fid: 3
              parent: <string>
              channel_id: neynar
              idem: <string>
              parent_author_fid: 3
  response:
    '200':
      application/json:
        schemaArray:
          - type: object
            properties:
              success:
                allOf:
                  - type: boolean
              cast:
                allOf:
                  - type: object
                    properties:
                      hash:
                        type: string
                        pattern: ^(0x)?[a-fA-F0-9]{40}$
                        example: '0x71d5225f77e0164388b1d4c120825f3a2c1f131c'
                      author:
                        type: object
                        properties:
                          fid:
                            $ref: '#/components/schemas/Fid'
                        required:
                          - fid
                      text:
                        type: string
                    required:
                      - hash
                      - author
                      - text
            title: PostCastResponse
            refIdentifier: '#/components/schemas/PostCastResponse'
            requiredProperties:
              - success
              - cast
        examples:
          example:
            value:
              success: true
              cast:
                hash: '0x71d5225f77e0164388b1d4c120825f3a2c1f131c'
                author:
                  fid: 3
                text: <string>
        description: Success
    '400':
      application/json:
        schemaArray:
          - type: object
            properties:
              code:
                allOf:
                  - &ref_0
                    type: string
              message:
                allOf:
                  - &ref_1
                    type: string
              property:
                allOf:
                  - &ref_2
                    type: string
              status:
                allOf:
                  - &ref_3
                    type: integer
                    format: int32
            title: ErrorRes
            description: Details for the error response
            refIdentifier: '#/components/schemas/ErrorRes'
            requiredProperties: &ref_4
              - message
        examples:
          example:
            value:
              code: <string>
              message: <string>
              property: <string>
              status: 123
        description: Bad Request
    '403':
      application/json:
        schemaArray:
          - type: object
            properties:
              code:
                allOf:
                  - *ref_0
              message:
                allOf:
                  - *ref_1
              property:
                allOf:
                  - *ref_2
              status:
                allOf:
                  - *ref_3
            title: ErrorRes
            description: Details for the error response
            refIdentifier: '#/components/schemas/ErrorRes'
            requiredProperties: *ref_4
        examples:
          example:
            value:
              code: <string>
              message: <string>
              property: <string>
              status: 123
        description: Forbidden
    '404':
      application/json:
        schemaArray:
          - type: object
            properties:
              code:
                allOf:
                  - *ref_0
              message:
                allOf:
                  - *ref_1
              property:
                allOf:
                  - *ref_2
              status:
                allOf:
                  - *ref_3
            title: ErrorRes
            description: Details for the error response
            refIdentifier: '#/components/schemas/ErrorRes'
            requiredProperties: *ref_4
        examples:
          example:
            value:
              code: <string>
              message: <string>
              property: <string>
              status: 123
        description: Resource not found
    '500':
      application/json:
        schemaArray:
          - type: object
            properties:
              code:
                allOf:
                  - *ref_0
              message:
                allOf:
                  - *ref_1
              property:
                allOf:
                  - *ref_2
              status:
                allOf:
                  - *ref_3
            title: ErrorRes
            description: Details for the error response
            refIdentifier: '#/components/schemas/ErrorRes'
            requiredProperties: *ref_4
        examples:
          example:
            value:
              code: <string>
              message: <string>
              property: <string>
              status: 123
        description: Server Error
  deprecated: false
  type: path
components:
  schemas:
    Fid:
      type: integer
      minimum: 0
      description: The unique identifier of a farcaster user or app (unsigned integer)
      example: 3
      title: Fid
      format: int32
    SignerUUID:
      type: string
      example: 19d0c5fd-9b33-4a48-a0e2-bc7b0555baec
      title: SignerUUID
      description: >-
        UUID of the signer.

        `signer_uuid` is paired with API key, can't use a `uuid` made with a
        different API key.
    PostCastReqBodyEmbedsCastIdProperties:
      type: object
      properties:
        hash:
          type: string
        fid:
          $ref: '#/components/schemas/Fid'
      required:
        - hash
        - fid
      title: PostCastReqBodyEmbedsCastIdProperties
    PostCastReqBodyEmbeds:
      oneOf:
        - type: object
          properties:
            cast_id:
              $ref: '#/components/schemas/PostCastReqBodyEmbedsCastIdProperties'
          required:
            - cast_id
          additionalProperties: false
        - type: object
          properties:
            castId:
              $ref: '#/components/schemas/PostCastReqBodyEmbedsCastIdProperties'
          required:
            - castId
          additionalProperties: false
        - type: object
          properties:
            url:
              type: string
          required:
            - url
          additionalProperties: false
      title: PostCastReqBodyEmbeds
      additionalProperties: false
    CastParent:
      type: string
      description: parent_url of the channel the cast is in, or hash of the cast
      title: CastParent
    Idem:
      type: string
      title: Idem
      description: >-
        An Idempotency key is a unique identifier for the request.

        **Note:** 

        1) This is used to prevent duplicate requests. Use the same idem key on
        retry attempts.

        2) This should be a unique identifier for each request.

        3) Recommended format is a 16-character string generated by the
        developer at the time of making this request.

````