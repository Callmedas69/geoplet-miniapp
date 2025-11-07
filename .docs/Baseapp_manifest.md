Core Concepts
Manifest

Copy page

Define how your mini app appears and behaves within the Base app, enabling search, discovery, and rich embed features in the Base app.

​
Implementation
Create the manifest file in your project at /public/.well-known/farcaster.json. It needs to be accessible at https://your-domain.com/.well-known/farcaster.json
Update the required and optional fields in the miniapp object
Ensure all changes are live so that the Manifest file is available at your app’s url
Navigate to the Base Build Account association tool
Paste your domain in the App URL field (ex: sample-url.vercel.app) and click “Submit”
Click on the “Verify” button that appears and sign the manifest with your wallet to generate the accountAssociation fields
Copy the generated accountAssociation fields (header, payload, and signature) and paste them into your manifest file, replacing the empty values in the accountAssociation object
Changes to the manifest take effect when you redeploy your Mini App and repost it. The platform re-indexes the updated configuration and applies changes to search, discovery, and embed rendering.
Use the Mini App Assets Generator to generate properly formatted icons, splash screens, and images that meet the requirements for both Base App and Farcaster mini apps.
​
Schema
​
accountAssociation
Proves domain ownership for your Mini App.
​
header
stringrequired
Encoded header for the association payload.
​
payload
stringrequired
Encoded payload containing your domain.
​
signature
stringrequired
Signature over the payload.
​
baseBuilder
This verifies ownership and connects your Base Build account.This address should be the address of the wallet used when importing your mini app to Base Build.
​
ownerAddress
stringrequired
This verifies ownership and connects your Base Build account.
​
Identity & Launch
Defines your Mini App’s core identity and the URL users land on when they open it.
​
version
stringrequired
Manifest version. Must be "1".
​
name
stringrequired
Mini App name. Max 32 chars.
​
homeUrl
stringrequired
Default launch URL. HTTPS URL, max 1024 chars.
​
iconUrl
stringrequired
Icon image URL. HTTPS URL, PNG 1024×1024; transparent background discouraged.
​
Loading Experience
Controls the splash screen visuals and colors shown while your Mini App loads.
​
splashImageUrl
stringrequired
Loading image. HTTPS URL, recommended 200×200px.
​
splashBackgroundColor
stringrequired
Loading background color. Hex code (e.g., #000000).
​
Discovery & Search
Determines how your Mini App is indexed, categorized, and surfaced across Base App discovery features.
​
primaryCategory
stringrequired
Controls where your app appears in category browsing. One of: games, social, finance, utility, productivity, health-fitness, news-media, music, shopping, education, developer-tools, entertainment, art-creativity.
​
tags
string[]required
Search/filter tags. Up to 5; ≤ 20 chars each; lowercase; no spaces/emojis/special chars.
​
noindex
boolean
Exclude from search results. true = exclude, default = include.
​
Display Information
Provides the descriptive text, screenshots, and promotional images shown on your Mini App’s profile.
​
subtitle
string
Short description under name. Max 30 chars; avoid emojis/special chars.
​
description
string
Promo text for app page. Max 170 chars; avoid emojis/special chars.
​
tagline
string
Marketing tagline. Max 30 chars.
​
heroImageUrl
string
Large promo image. 1200×630px (1.91:1), PNG/JPG.
​
screenshotUrls
string[]
Visual previews. Max 3; portrait 1284×2778px recommended.
​
Notifications
Notification endpoint.
​
webhookUrl
string
POST events endpoint. HTTPS URL, max 1024 chars. Required if using notifications.
​
Embeds & Social Sharing
Configures how your Mini App appears when shared in feeds or on social platforms.
​
ogTitle
string
Open Graph title. Max 30 chars.
​
ogDescription
string
Open Graph description. Max 100 chars.
​
ogImageUrl
string
Open Graph image. 1200×630px (1.91:1), PNG/JPG.
​
Related Concepts
Embeds and Previews
Understand how your manifest creates rich embeds when your Mini App is shared in feeds and social platforms.
Was this page helpful?


Yes

No


{
  "accountAssociation": {
    "header": "eyJmaWQiOjkxNTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMmVmNzkwRGQ3OTkzQTM1ZkQ4NDdDMDUzRURkQUU5NDBEMDU1NTk2In0",
    "payload": "eyJkb21haW4iOiJhcHAuZXhhbXBsZS5jb20ifQ",
    "signature": "MHgxMGQwZGU4ZGYwZDUwZTdmMGIxN2YxMTU2NDI1MjRmZTY0MTUyZGU4ZGU1MWU0MThiYjU4ZjVmZmQxYjRjNDBiNGVlZTRhNDcwNmVmNjhlMzQ0ZGQ5MDBkYmQyMmNlMmVlZGY5ZGQ0N2JlNWRmNzMwYzUxNjE4OWVjZDJjY2Y0MDFj"
  },
  "baseBuilder": {
    "ownerAddress": "0x..." 
  },
  "miniapp": {
    "version": "1",
    "name": "Crypto Portfolio Tracker",
    "homeUrl": "https://ex.co",
    "iconUrl": "https://ex.co/i.png",
    "splashImageUrl": "https://ex.co/l.png",
    "splashBackgroundColor": "#000000",
    "webhookUrl": "https://ex.co/api/webhook",
    "subtitle": "Easy to manage",
    "description": "Track and manage your cryptocurrency portfolio.",
    "screenshotUrls": [
      "https://ex.co/s1.png",
      "https://ex.co/s2.png",
      "https://ex.co/s3.png"
    ],
    "primaryCategory": "finance",
    "tags": ["finance"],
    "heroImageUrl": "https://ex.co/og.png",
    "tagline": "Save instantly",
    "ogTitle": "Example Mini App",
    "ogDescription": "Easy to manage portfolio.",
    "ogImageUrl": "https://ex.co/og.png",
    "noindex": true
  }
}