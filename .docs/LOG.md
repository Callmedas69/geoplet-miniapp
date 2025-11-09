# Create a Mini App

> Quickly create a mini app, sign a manifest, and publish to the Base app.

**Prerequisites**

* Base app account
* [Vercel](https://vercel.com/) account for hosting the application

<Panel>
  <iframe className="w-3/4 aspect-video rounded-xl mx-auto block" src="https://www.youtube-nocookie.com/embed/vLnugincHAg?si=I_jyZxSzVe32nuC5" title="Create a new mini app in under 10 mins" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />
</Panel>

<Steps>
  <Step title="Deploy Template">
    Click the button below and follow the prompts to deploy the quickstart template to Vercel.

    <Card title="Deploy to Vercel" icon="rocket" href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbase%2Fdemos%2Ftree%2Fmaster%2Fmini-apps%2Ftemplates%2Fminikit%2Fnew-mini-app-quickstart&project-name=new-mini-app-quickstart&repository-name=new-mini-app-quickstart&env=NEXT_PUBLIC_PROJECT_NAME&demo-title=New%20Mini%20App&demo-description=Quickstart%20waitlist%20mini%20app%20with%20MiniKit%20on%20Base" horizontal>
      Rapidly deploy the quickstart template to Vercel to get started.
    </Card>
  </Step>

  <Step title="Clone your repository">
    Clone the repo created by Vercel to make local edits.

    Replace `<your-username>` with your github username.

    ```bash Terminal theme={null}
    git clone https://github.com/<your-username>/new-mini-app-quickstart
    cd new-mini-app-quickstart
    npm install
    ```
  </Step>

  <Step title="Update Manifest configuration">
    The `minikit.config.ts` file is responsible for configuring your manifest located at `app/.well-known/farcaster.json` and creating embed metadata.

    <Tip> You can customize the manifest by updating the `miniapp` object.</Tip>

    For details on each field, see the [field reference](/mini-apps/features/manifest#field-reference).

    ```ts minikit.config.ts theme={null}
    export const minikitConfig = {
      accountAssociation: { // this will be added in step 5
        "header": "",
        "payload": "",
        "signature": ""
      },
      miniapp: {
        version: "1",
        name: "Cubey", 
        subtitle: "Your AI Ad Companion", 
        description: "Ads",
        screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
        iconUrl: `${ROOT_URL}/blue-icon.png`,
        splashImageUrl: `${ROOT_URL}/blue-hero.png`,
        splashBackgroundColor: "#000000",
        homeUrl: ROOT_URL,
        webhookUrl: `${ROOT_URL}/api/webhook`,
        primaryCategory: "social",
        tags: ["marketing", "ads", "quickstart", "waitlist"],
        heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
        tagline: "",
        ogTitle: "",
        ogDescription: "",
        ogImageUrl: `${ROOT_URL}/blue-hero.png`,
      },
    } as const;
    ```
  </Step>

  <Step title="Create accountAssociation Credentials">
    Now that you have a public domain for your application, you are ready to associate your mini app with your Farcaster account.

    1. Ensure all changes are live by pushing changes to the `main` branch.
       <Tip>Ensure that Vercel's **Deployment Protection** is off by going to the Vercel dashboard for your project and navigating to Settings -> Deployment Protection and toggling "Vercel Authentication" to off and click save. </Tip>

    2. Navigate to the Base Build [Account association tool](https://www.base.dev/preview?tab=account).

    3. Paste your domain in the `App URL` field (ex: sample-url.vercel.app) and click "Submit"

    <img src="https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=70bec5b0b685b908db655187637abcc0" alt="Sign manifest" height="300" className="rounded-lg" data-og-width="1920" data-og-height="1048" data-path="images/base-build/sign-manifest.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=280&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=5e298e5b70a7e65fdf9005cf6d818396 280w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=560&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=9a7af3ef5a828a1248757ce520336dfa 560w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=840&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=69d45dadc50377e3dbb9209d3d90e5c6 840w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=1100&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=146243666d25e818ffaf2e5c21e4c095 1100w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=1650&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=73b751caaf7f71b31cff9b462e62e3f9 1650w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=2500&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=1e49d69f320478f6a1ad1a9aeca1767f 2500w" />

    4. Click on the "Verify" button that appears and follow the instructions to generate the `accountAssociation` fields.
    5. Copy the `accountAssociation` object
  </Step>

  <Step title="Update `minikit.config.ts`">
    Update your `minikit.config.ts` file to include the `accountAssociation` object you copied in the previous step.

    ```ts minikit.config.ts theme={null}
    export const minikitConfig = {
        accountAssociation: {
            "header": "eyJmaBBiOjE3MzE4LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NzYwQjA0NDc5NjM4MTExNzNmRjg3YDPBYzA5OEJBQ0YxNzNCYkU0OCJ9",
            "payload": "eyJkb21haW4iOiJ4BWl0bGlzdC1xcy52ZXJjZWwuYXBwIn7",
            "signature": "MHhmNGQzN2M2OTk4NDIwZDNjZWVjYTNiODllYzJkMjAwOTkyMDEwOGVhNTFlYWI3NjAyN2QyMmM1MDVhNzIyMWY2NTRiYmRlZmQ0NGQwOWNiY2M2NmI2B7VmNGZiMmZiOGYzNDVjODVmNmQ3ZTVjNzI3OWNmMGY4ZTA2ODYzM2FjZjFi"
        },
        miniapp: {
            ...
        },
      }
    ```
  </Step>

  <Step title="Push updates to production">
    Push all changes to the `main` branch. Vercel will automatically deploy the changes to your production environment.
  </Step>

  <Step title="Preview Your App">
    Go to [base.dev/preview](https://base.dev/preview) to validate your app.

    1. Add your app URL to view the embeds and click the launch button to verify the app launches as expected.
    2. Use the "Account association" tab to verify the association credentials were created correctly.
    3. Use the "Metadata" tab to see the metadata added from the manifest and identify any missing fields.

    <video autoPlay muted loop playsInline src="https://mintcdn.com/base-a060aa97/hlNNNlUJtlshvXQM/videos/mini-apps/basebuildpreview.mp4?fit=max&auto=format&n=hlNNNlUJtlshvXQM&q=85&s=65a4cb8ce13c9940cba6aee73b8ececb" data-path="videos/mini-apps/basebuildpreview.mp4" />
  </Step>

  <Step title="Post to Publish">
    To publish your app, create a post in the Base app with your app's URL.

    <img src="https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=71a07b27f04a4df65f47fced5b2b76a5" alt="Posting an app to Base app" height="300" className="rounded-lg" data-og-width="1143" data-og-height="1380" data-path="images/minikit/publish-app-base.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=280&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=aa2a25afd0e22fad807642a6753446fc 280w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=560&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=187a5bdceb902dbfb0714088301bb58e 560w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=840&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=8e731221f349c80283e57ee3fddd5827 840w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=1100&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=fa5af302bc79f138a4989c91fb5f4c6b 1100w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=1650&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=90bbb4dbaea6ce60b0fc145348888ded 1650w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=2500&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=66414a12494828300cad19fef435b18c 2500w" />
  </Step>
</Steps>




# Create a Mini App

> Quickly create a mini app, sign a manifest, and publish to the Base app.

**Prerequisites**

* Base app account
* [Vercel](https://vercel.com/) account for hosting the application

<Panel>
  <iframe className="w-3/4 aspect-video rounded-xl mx-auto block" src="https://www.youtube-nocookie.com/embed/vLnugincHAg?si=I_jyZxSzVe32nuC5" title="Create a new mini app in under 10 mins" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />
</Panel>

<Steps>
  <Step title="Deploy Template">
    Click the button below and follow the prompts to deploy the quickstart template to Vercel.

    <Card title="Deploy to Vercel" icon="rocket" href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbase%2Fdemos%2Ftree%2Fmaster%2Fmini-apps%2Ftemplates%2Fminikit%2Fnew-mini-app-quickstart&project-name=new-mini-app-quickstart&repository-name=new-mini-app-quickstart&env=NEXT_PUBLIC_PROJECT_NAME&demo-title=New%20Mini%20App&demo-description=Quickstart%20waitlist%20mini%20app%20with%20MiniKit%20on%20Base" horizontal>
      Rapidly deploy the quickstart template to Vercel to get started.
    </Card>
  </Step>

  <Step title="Clone your repository">
    Clone the repo created by Vercel to make local edits.

    Replace `<your-username>` with your github username.

    ```bash Terminal theme={null}
    git clone https://github.com/<your-username>/new-mini-app-quickstart
    cd new-mini-app-quickstart
    npm install
    ```
  </Step>

  <Step title="Update Manifest configuration">
    The `minikit.config.ts` file is responsible for configuring your manifest located at `app/.well-known/farcaster.json` and creating embed metadata.

    <Tip> You can customize the manifest by updating the `miniapp` object.</Tip>

    For details on each field, see the [field reference](/mini-apps/features/manifest#field-reference).

    ```ts minikit.config.ts theme={null}
    export const minikitConfig = {
      accountAssociation: { // this will be added in step 5
        "header": "",
        "payload": "",
        "signature": ""
      },
      miniapp: {
        version: "1",
        name: "Cubey", 
        subtitle: "Your AI Ad Companion", 
        description: "Ads",
        screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
        iconUrl: `${ROOT_URL}/blue-icon.png`,
        splashImageUrl: `${ROOT_URL}/blue-hero.png`,
        splashBackgroundColor: "#000000",
        homeUrl: ROOT_URL,
        webhookUrl: `${ROOT_URL}/api/webhook`,
        primaryCategory: "social",
        tags: ["marketing", "ads", "quickstart", "waitlist"],
        heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
        tagline: "",
        ogTitle: "",
        ogDescription: "",
        ogImageUrl: `${ROOT_URL}/blue-hero.png`,
      },
    } as const;
    ```
  </Step>

  <Step title="Create accountAssociation Credentials">
    Now that you have a public domain for your application, you are ready to associate your mini app with your Farcaster account.

    1. Ensure all changes are live by pushing changes to the `main` branch.
       <Tip>Ensure that Vercel's **Deployment Protection** is off by going to the Vercel dashboard for your project and navigating to Settings -> Deployment Protection and toggling "Vercel Authentication" to off and click save. </Tip>

    2. Navigate to the Base Build [Account association tool](https://www.base.dev/preview?tab=account).

    3. Paste your domain in the `App URL` field (ex: sample-url.vercel.app) and click "Submit"

    <img src="https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=70bec5b0b685b908db655187637abcc0" alt="Sign manifest" height="300" className="rounded-lg" data-og-width="1920" data-og-height="1048" data-path="images/base-build/sign-manifest.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=280&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=5e298e5b70a7e65fdf9005cf6d818396 280w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=560&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=9a7af3ef5a828a1248757ce520336dfa 560w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=840&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=69d45dadc50377e3dbb9209d3d90e5c6 840w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=1100&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=146243666d25e818ffaf2e5c21e4c095 1100w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=1650&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=73b751caaf7f71b31cff9b462e62e3f9 1650w, https://mintcdn.com/base-a060aa97/F2b0pmlGbdGjOPAu/images/base-build/sign-manifest.png?w=2500&fit=max&auto=format&n=F2b0pmlGbdGjOPAu&q=85&s=1e49d69f320478f6a1ad1a9aeca1767f 2500w" />

    4. Click on the "Verify" button that appears and follow the instructions to generate the `accountAssociation` fields.
    5. Copy the `accountAssociation` object
  </Step>

  <Step title="Update `minikit.config.ts`">
    Update your `minikit.config.ts` file to include the `accountAssociation` object you copied in the previous step.

    ```ts minikit.config.ts theme={null}
    export const minikitConfig = {
        accountAssociation: {
            "header": "eyJmaBBiOjE3MzE4LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NzYwQjA0NDc5NjM4MTExNzNmRjg3YDPBYzA5OEJBQ0YxNzNCYkU0OCJ9",
            "payload": "eyJkb21haW4iOiJ4BWl0bGlzdC1xcy52ZXJjZWwuYXBwIn7",
            "signature": "MHhmNGQzN2M2OTk4NDIwZDNjZWVjYTNiODllYzJkMjAwOTkyMDEwOGVhNTFlYWI3NjAyN2QyMmM1MDVhNzIyMWY2NTRiYmRlZmQ0NGQwOWNiY2M2NmI2B7VmNGZiMmZiOGYzNDVjODVmNmQ3ZTVjNzI3OWNmMGY4ZTA2ODYzM2FjZjFi"
        },
        miniapp: {
            ...
        },
      }
    ```
  </Step>

  <Step title="Push updates to production">
    Push all changes to the `main` branch. Vercel will automatically deploy the changes to your production environment.
  </Step>

  <Step title="Preview Your App">
    Go to [base.dev/preview](https://base.dev/preview) to validate your app.

    1. Add your app URL to view the embeds and click the launch button to verify the app launches as expected.
    2. Use the "Account association" tab to verify the association credentials were created correctly.
    3. Use the "Metadata" tab to see the metadata added from the manifest and identify any missing fields.

    <video autoPlay muted loop playsInline src="https://mintcdn.com/base-a060aa97/hlNNNlUJtlshvXQM/videos/mini-apps/basebuildpreview.mp4?fit=max&auto=format&n=hlNNNlUJtlshvXQM&q=85&s=65a4cb8ce13c9940cba6aee73b8ececb" data-path="videos/mini-apps/basebuildpreview.mp4" />
  </Step>

  <Step title="Post to Publish">
    To publish your app, create a post in the Base app with your app's URL.

    <img src="https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=71a07b27f04a4df65f47fced5b2b76a5" alt="Posting an app to Base app" height="300" className="rounded-lg" data-og-width="1143" data-og-height="1380" data-path="images/minikit/publish-app-base.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=280&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=aa2a25afd0e22fad807642a6753446fc 280w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=560&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=187a5bdceb902dbfb0714088301bb58e 560w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=840&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=8e731221f349c80283e57ee3fddd5827 840w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=1100&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=fa5af302bc79f138a4989c91fb5f4c6b 1100w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=1650&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=90bbb4dbaea6ce60b0fc145348888ded 1650w, https://mintcdn.com/base-a060aa97/t8Sjfqig2G4AU7Gh/images/minikit/publish-app-base.png?w=2500&fit=max&auto=format&n=t8Sjfqig2G4AU7Gh&q=85&s=66414a12494828300cad19fef435b18c 2500w" />
  </Step>
</Steps>



# Manifest

> Define how your mini app appears and behaves within the Base app, enabling search, discovery, and rich embed features in the Base app.

<Panel>
  ```json farcaster.json theme={null}
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
  ```

  <Tip>
    Set `"noindex": true` for development or staging environments to prevent search indexing.
  </Tip>
</Panel>

## Implementation

1. Create the manifest file in your project at `/public/.well-known/farcaster.json`. It needs to be accessible at `https://your-domain.com/.well-known/farcaster.json`
2. Update the [required](#accountassociation) and [optional](#display-information) fields in the `miniapp` object
3. Ensure all changes are live so that the Manifest file is available at your app's url
4. Navigate to the Base Build [Account association tool](https://www.base.dev/preview?tab=account)
5. Paste your domain in the App URL field (ex: sample-url.vercel.app) and click "Submit"
6. Click on the "Verify" button that appears and sign the manifest with your wallet to generate the `accountAssociation` fields
7. Copy the generated `accountAssociation` fields (header, payload, and signature) and paste them into your manifest file, replacing the empty values in the `accountAssociation` object

<Warning>
  Changes to the manifest take effect when you redeploy your Mini App and repost it. The platform re-indexes the updated configuration and applies changes to search, discovery, and embed rendering.
</Warning>

<Tip>
  Use the [Mini App Assets Generator](https://www.miniappassets.com/) to generate properly formatted icons, splash screens, and images that meet the requirements for both Base App and Farcaster mini apps.
</Tip>

## Schema

### accountAssociation

Proves domain ownership for your Mini App.

<Card>
  <ParamField path="header" type="string" required>
    Encoded header for the association payload.
  </ParamField>

  <ParamField path="payload" type="string" required>
    Encoded payload containing your domain.
  </ParamField>

  <ParamField path="signature" type="string" required>
    Signature over the payload.
  </ParamField>
</Card>

### baseBuilder

This verifies ownership and connects your Base Build account.This address should be the address of the wallet used when importing your mini app to Base Build.

<Card>
  <ParamField path="ownerAddress" type="string" required>
    This verifies ownership and connects your Base Build account.
  </ParamField>
</Card>

#### Identity & Launch

Defines your Mini App's core identity and the URL users land on when they open it.

<Card>
  <ParamField path="version" type="string" required>
    Manifest version. Must be `"1"`.
  </ParamField>

  <ParamField path="name" type="string" required>
    Mini App name. Max 32 chars.
  </ParamField>

  <ParamField path="homeUrl" type="string" required>
    Default launch URL. HTTPS URL, max 1024 chars.
  </ParamField>

  <ParamField path="iconUrl" type="string" required>
    Icon image URL. HTTPS URL, PNG 1024×1024; transparent background discouraged.
  </ParamField>
</Card>

#### Loading Experience

Controls the splash screen visuals and colors shown while your Mini App loads.

<Card>
  <ParamField path="splashImageUrl" type="string" required>
    Loading image. HTTPS URL, recommended 200×200px.
  </ParamField>

  <ParamField path="splashBackgroundColor" type="string" required>
    Loading background color. Hex code (e.g., `#000000`).
  </ParamField>
</Card>

#### Discovery & Search

Determines how your Mini App is indexed, categorized, and surfaced across Base App discovery features.

<Card>
  <ParamField path="primaryCategory" type="string" required>
    Controls where your app appears in category browsing. One of: `games`, `social`, `finance`, `utility`, `productivity`, `health-fitness`, `news-media`, `music`, `shopping`, `education`, `developer-tools`, `entertainment`, `art-creativity`.
  </ParamField>

  <ParamField path="tags" type="string[]" required>
    Search/filter tags. Up to 5; ≤ 20 chars each; lowercase; no spaces/emojis/special chars.
  </ParamField>

  <ParamField path="noindex" type="boolean">
    Exclude from search results. `true` = exclude, default = include.
  </ParamField>
</Card>

#### Display Information

Provides the descriptive text, screenshots, and promotional images shown on your Mini App's profile.

<Card>
  <ParamField path="subtitle" type="string">
    Short description under name. Max 30 chars; avoid emojis/special chars.
  </ParamField>

  <ParamField path="description" type="string">
    Promo text for app page. Max 170 chars; avoid emojis/special chars.
  </ParamField>

  <ParamField path="tagline" type="string">
    Marketing tagline. Max 30 chars.
  </ParamField>

  <ParamField path="heroImageUrl" type="string">
    Large promo image. 1200×630px (1.91:1), PNG/JPG.
  </ParamField>

  <ParamField path="screenshotUrls" type="string[]">
    Visual previews. Max 3; portrait 1284×2778px recommended.
  </ParamField>
</Card>

#### Notifications

Notification endpoint.

<Card>
  <ParamField path="webhookUrl" type="string">
    POST events endpoint. HTTPS URL, max 1024 chars. Required if using notifications.
  </ParamField>
</Card>

#### Embeds & Social Sharing

Configures how your Mini App appears when shared in feeds or on social platforms.

<Card>
  <ParamField path="ogTitle" type="string">
    Open Graph title. Max 30 chars.
  </ParamField>

  <ParamField path="ogDescription" type="string">
    Open Graph description. Max 100 chars.
  </ParamField>

  <ParamField path="ogImageUrl" type="string">
    Open Graph image. 1200×630px (1.91:1), PNG/JPG.
  </ParamField>
</Card>

## Related Concepts

<CardGroup cols={1}>
  <Card title="Embeds and Previews" href="/mini-apps/core-concepts/embeds-and-previews">
    Understand how your manifest creates rich embeds when your Mini App is shared in feeds and social platforms.
  </Card>
</CardGroup>



# Mini App Context

> Improve user experience by instantly displaying user profile data and customizing user flows based on where your mini app was opened

When your app is opened as a mini app, `sdk.context` provides 4 data objects:

* `user`: User profile data
* `location`: Where the mini app was opened
* `client`: Host platform (e.g. the Base app or another Farcaster client) and device data
* `features`: Availability and state of features in the current client

<Panel>
  ```ts MiniAppContextTypes.ts theme={null}
  export type MiniAppPlatformType = 'web' | 'mobile';
   
  export type MiniAppContext = {
    user: {
      fid: number;
      username?: string;
      displayName?: string;
      pfpUrl?: string;
    };
    location?: MiniAppLocationContext;
    client: {
      platformType?: MiniAppPlatformType;
      clientFid: number;
      added: boolean;
      safeAreaInsets?: SafeAreaInsets;
      notificationDetails?: MiniAppNotificationDetails;
    };
    features?: {
      haptics: boolean;
      cameraAndMicrophoneAccess?: boolean;
    };
  };
  ```
</Panel>

## Implementation

1. Install and import `@farcaster/miniapp-sdk`
2. Check if opened as a mini app using `sdk.isInMiniApp();`
3. If in a mini app, load the context object using `sdk.context`

In the example below we detect if the app was opened as a mini app, and if so, we return the user's username, fid, display name, and profile image.

```typescript app/profile/page.tsx theme={null}
"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false); 

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if we're in a Mini App
        const miniAppStatus = await sdk.isInMiniApp();
        setIsInMiniApp(miniAppStatus);

        if (miniAppStatus) {
          // Get context and extract user info
          const context = await sdk.context;
          setUser(context.user);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, []);

  // Show message if not in Mini App
  if (!isInMiniApp) {
    return (
      <div>
        <p>Please open this app in a Farcaster or Base client to see your profile.</p>
      </div>
    );
  }

  // Show user information
  if (user) {
    return (
      <div>
        <h2>Welcome, {user.displayName || user.username}!</h2>
        <p>FID: {user.fid}</p>
        <p>Username: @{user.username}</p>
        {user.pfpUrl && (
          <img 
            src={user.pfpUrl} 
            alt="Profile" 
            width={64} 
            height={64} 
            style={{ borderRadius: '50%' }}
          />
        )}
      </div>
    );
  }

  return <div>Loading user profile...</div>;
}
```

## Schema

### User Object

Contains the user's profile information. This data shouldn't be used for authentication or sensitive actions because its passed by the application.

<Card>
  <ParamField path="fid" type="number" required>
    Unique Farcaster identifier for the user.
  </ParamField>

  <ParamField path="username" type="string">
    Handle without @ symbol.
  </ParamField>

  <ParamField path="displayName" type="string">
    User's chosen display name.
  </ParamField>

  <ParamField path="pfpUrl" type="string">
    Profile picture URL.
  </ParamField>

  <ParamField path="bio" type="string">
    User's biography text.
  </ParamField>

  <ParamField path="location" type="object">
    User's location information.
  </ParamField>

  <ParamField path="location.placeId" type="string">
    Google Places ID.
  </ParamField>

  <ParamField path="location.description" type="string">
    Human-readable location description.
  </ParamField>
</Card>

```json user.json theme={null}
{
  "fid": 6841,
  "username": "deodad",
  "displayName": "Tony D'Addeo",
  "pfpUrl": "https://i.imgur.com/dMoIan7.jpg",
  "bio": "Building @warpcast and @farcaster",
  "location": {
    "placeId": "ChIJLwPMoJm1RIYRetVp1EtGm10",
    "description": "Austin, TX, USA"
  }
}
```

### Location Object

Contains information about the context from which the Mini App was launched. This helps you understand how users discovered and accessed your app.

**Location Types:**

* **`cast_embed`**: Launched from a cast where your app is embedded
* **`cast_share`**: Launched when a user shared a cast to your app
* **`notification`**: Launched from a notification triggered by your app
* **`launcher`**: Launched directly from the client app catalog
* **`channel`**: Launched from within a specific Farcaster channel
* **`open_miniapp`**: Launched from another Mini App

#### CastEmbedLocationContext

<Card>
  <ParamField path="type" type="'cast_embed'" required>
    Indicates the Mini App was launched from a cast where it is an embed.
  </ParamField>

  <ParamField path="embed" type="string" required>
    The embed URL.
  </ParamField>

  <ParamField path="cast" type="MiniAppCast" required>
    Cast information containing the embed.
  </ParamField>
</Card>

```json cast_embed.json theme={null}
{
  "type": "cast_embed",
  "embed": "https://myapp.example.com",
  "cast": {
    "author": {
      "fid": 3621,
      "username": "alice",
      "displayName": "Alice",
      "pfpUrl": "https://example.com/alice.jpg"
    },
    "hash": "0xa2fbef8c8e4d00d8f84ff45f9763b8bae2c5c544",
    "timestamp": 1749160866000,
    "text": "Check out this awesome mini app!",
    "embeds": ["https://myapp.example.com"],
    "channelKey": "farcaster"
  }
}
```

#### CastShareLocationContext

<Card>
  <ParamField path="type" type="'cast_share'" required>
    Indicates the Mini App was launched when a user shared a cast to your app.
  </ParamField>

  <ParamField path="cast" type="MiniAppCast" required>
    The cast that was shared to your app.
  </ParamField>
</Card>

#### NotificationLocationContext

<Card>
  <ParamField path="type" type="'notification'" required>
    Indicates the Mini App was launched from a notification.
  </ParamField>

  <ParamField path="notification" type="object" required>
    Notification details.

    <ParamField path="notification.notificationId" type="string" required>
      Unique notification identifier.
    </ParamField>

    <ParamField path="notification.title" type="string" required>
      Notification title.
    </ParamField>

    <ParamField path="notification.body" type="string" required>
      Notification body text.
    </ParamField>
  </ParamField>
</Card>

```json notification.json theme={null}
{
  "type": "notification",
  "notification": {
    "notificationId": "f7e9ebaf-92f0-43b9-a410-ad8c24f3333b",
    "title": "Yoinked!",
    "body": "horsefacts captured the flag from you."
  }
}
```

#### LauncherLocationContext

<Card>
  <ParamField path="type" type="'launcher'" required>
    Indicates the Mini App was launched directly by the client app outside of a context.
  </ParamField>
</Card>

#### ChannelLocationContext

<Card>
  <ParamField path="type" type="'channel'" required>
    Indicates the Mini App was launched from within a specific Farcaster channel.
  </ParamField>

  <ParamField path="channel" type="object" required>
    Channel details.
  </ParamField>

  <ParamField path="channel.key" type="string" required>
    Channel key identifier.
  </ParamField>

  <ParamField path="channel.name" type="string" required>
    Channel name.
  </ParamField>

  <ParamField path="channel.imageUrl" type="string">
    Channel profile image URL.
  </ParamField>
</Card>

#### OpenMiniAppLocationContext

<Card>
  <ParamField path="type" type="'open_miniapp'" required>
    Indicates the Mini App was launched from another Mini App.
  </ParamField>

  <ParamField path="referrerDomain" type="string" required>
    The domain of the Mini App that opened the current app.
  </ParamField>
</Card>

### Client Object

Contains details about the Farcaster client running your Mini App. This data should be considered untrusted.

#### ClientContext

<Card>
  <ParamField path="platformType" type="'web' | 'mobile'">
    Platform where the app is running.
  </ParamField>

  <ParamField path="clientFid" type="number" required>
    Self-reported FID of the client (e.g., 9152 for Farcaster).
  </ParamField>

  <ParamField path="added" type="boolean" required>
    Whether the user has added your Mini App to their client.
  </ParamField>

  <ParamField path="safeAreaInsets" type="object">
    Screen insets to avoid navigation elements that obscure the view.

    <Expandable title="properties">
      <ParamField path="top" type="number" required>
        Top safe area inset in pixels.
      </ParamField>

      <ParamField path="bottom" type="number" required>
        Bottom safe area inset in pixels.
      </ParamField>

      <ParamField path="left" type="number" required>
        Left safe area inset in pixels.
      </ParamField>

      <ParamField path="right" type="number" required>
        Right safe area inset in pixels.
      </ParamField>
    </Expandable>
  </ParamField>

  <ParamField path="notificationDetails" type="object">
    Notification configuration if enabled.

    <Expandable title="properties">
      <ParamField path="url" type="string" required>
        Endpoint for sending notifications.
      </ParamField>

      <ParamField path="token" type="string" required>
        Authentication token for notifications.
      </ParamField>
    </Expandable>
  </ParamField>
</Card>

```json client.json theme={null}
{
  "platformType": "mobile",
  "clientFid": 9152,
  "added": true,
  "safeAreaInsets": {
    "top": 0,
    "bottom": 20,
    "left": 0,
    "right": 0
  },
  "notificationDetails": {
    "url": "https://api.farcaster.xyz/v1/frame-notifications",
    "token": "a05059ef2415c67b08ecceb539201cbc6"
  }
}
```

### Features Object

Indicates which platform features are available and their current state in the client.

<Card>
  <ParamField path="haptics" type="boolean" required>
    Whether haptic feedback is supported on the current platform.
  </ParamField>

  <ParamField path="cameraAndMicrophoneAccess" type="boolean">
    Whether camera and microphone permissions have been granted and stored for this mini app.
  </ParamField>
</Card>

```json features.json theme={null}
{
  "haptics": true,
  "cameraAndMicrophoneAccess": true
}
```

<Note>For more detailed capability detection, use the `sdk.getCapabilities()` method which returns specific SDK methods supported by the host.</Note>


# Embeds & Previews

> Mini apps use metadata to create embeds when users share links. The embed shows a preview image and launch button.

<Panel>
  <Frame caption="Mini App embed in social feed">
    <img src="https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=0bff73fdce8aef932cb9245a833eb506" alt="Mini app feed" className="h-[220px] w-auto" data-og-width="1014" width="1014" data-og-height="1000" height="1000" data-path="images/minikit/feed_mini.jpg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=280&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=a47124f96e5bf2be2c999336d8227149 280w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=560&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=52477b97dc901ea28a72100983ac2871 560w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=840&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=03af290041002c1799420524a699e0cd 840w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=1100&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=a10ed121eb31bc6796ad54a79c6e59e1 1100w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=1650&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=bef7f6b64c816d8bd908207f72a0c779 1650w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=2500&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=aa452c24d924cde0bf3af397e8c0d933 2500w" />
  </Frame>
</Panel>

## Implementation

Add this meta tag to the `<head>` section of any page you want to make shareable:

<CodeGroup>
  ```html html metadata theme={null}
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>My Mini App</title>
      <meta
        name="fc:miniapp"
        content='{
          "version": "next",
          "imageUrl": "https://example.com/preview.png",
          "button": {
            "title": "Open App",
            "action": {
              "type": "launch_frame",
              "url": "https://example.com"
            }
          }
        }'
      />
    </head>
    <body>
      <!-- Your app content -->
    </body>
  </html>
  ```

  ```jsx next.js metadata theme={null}
  // app/layout.tsx or app/page.tsx (Next.js App Router)
  import type { Metadata } from "next";

  export async function generateMetadata(): Promise<Metadata> {
  return {
    title: miniapp.name,
    description: miniapp.description,
    other: {
      "fc:miniapp": JSON.stringify({
        version: miniapp.version,
        imageUrl: miniapp.heroImageUrl,
        button: {
          title: `Join the ${miniapp.name}`,
          action: {
            name: `Launch ${miniapp.name}`,
            url: `${miniapp.homeUrl}`
          },
        },
      }),
    },
  };
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }
  ```
</CodeGroup>

<Tip>The `homeUrl` used in the `manifest` *must* have embed metadata defined, in order for the mini app to render correctly in the Base app.</Tip>

## Schema

<Card>
  <ParamField path="version" type="string" required>
    Version of the embed. Must be `"1"` or `"next"`.
  </ParamField>

  <ParamField path="imageUrl" type="string" required>
    Image URL for the embed. Must be 3:2 aspect ratio, maximum 10MB, maximum 1024 characters.
  </ParamField>

  <ParamField path="button" type="object" required>
    Button configuration object.
  </ParamField>
</Card>

### Button Configuration

Defines the launch button that appears on the embed.

<Card>
  <ParamField path="button.title" type="string" required>
    Button text. Maximum 32 characters.
  </ParamField>

  <ParamField path="button.action" type="object" required>
    Action configuration object. Maximum 1024 characters.
  </ParamField>
</Card>

### Action Configuration

Specifies what happens when the embed button is clicked.

<Card>
  <ParamField path="button.action.type" type="string" required>
    Action type. Must be `"launch_frame"`.
  </ParamField>

  <ParamField path="button.action.url" type="string">
    App URL to open. Defaults to the full URL of the page including query parameters. Maximum 1024 characters.
  </ParamField>

  <ParamField path="button.action.name" type="string">
    Application name. Maximum 32 characters. Defaults to manifest name.
  </ParamField>

  <ParamField path="button.action.splashImageUrl" type="string">
    Splash screen image URL. Must be 200x200 pixels. Maximum 32 characters. Defaults to manifest splash image.
  </ParamField>

  <ParamField path="button.action.splashBackgroundColor" type="string">
    Splash screen background color. Must be hex color code. Defaults to manifest splash background color.
  </ParamField>
</Card>

## Related Concepts

<CardGroup cols={2}>
  <Card title="Search and Discovery" href="/mini-apps/technical-guides/search-and-discovery">
    Learn how your manifest powers search indexing and category placement in the Base app discovery features.
  </Card>

  <Card title="Sharing and Social Graph" href="/mini-apps/technical-guides/sharing-and-social-graph">
    Learn how to maximize sharing, social engagement, and viral growth for your Mini App using Base's social graph features.
  </Card>
</CardGroup>


# Embeds & Previews

> Mini apps use metadata to create embeds when users share links. The embed shows a preview image and launch button.

<Panel>
  <Frame caption="Mini App embed in social feed">
    <img src="https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=0bff73fdce8aef932cb9245a833eb506" alt="Mini app feed" className="h-[220px] w-auto" data-og-width="1014" width="1014" data-og-height="1000" height="1000" data-path="images/minikit/feed_mini.jpg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=280&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=a47124f96e5bf2be2c999336d8227149 280w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=560&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=52477b97dc901ea28a72100983ac2871 560w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=840&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=03af290041002c1799420524a699e0cd 840w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=1100&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=a10ed121eb31bc6796ad54a79c6e59e1 1100w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=1650&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=bef7f6b64c816d8bd908207f72a0c779 1650w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/feed_mini.jpg?w=2500&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=aa452c24d924cde0bf3af397e8c0d933 2500w" />
  </Frame>
</Panel>

## Implementation

Add this meta tag to the `<head>` section of any page you want to make shareable:

<CodeGroup>
  ```html html metadata theme={null}
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>My Mini App</title>
      <meta
        name="fc:miniapp"
        content='{
          "version": "next",
          "imageUrl": "https://example.com/preview.png",
          "button": {
            "title": "Open App",
            "action": {
              "type": "launch_frame",
              "url": "https://example.com"
            }
          }
        }'
      />
    </head>
    <body>
      <!-- Your app content -->
    </body>
  </html>
  ```

  ```jsx next.js metadata theme={null}
  // app/layout.tsx or app/page.tsx (Next.js App Router)
  import type { Metadata } from "next";

  export async function generateMetadata(): Promise<Metadata> {
  return {
    title: miniapp.name,
    description: miniapp.description,
    other: {
      "fc:miniapp": JSON.stringify({
        version: miniapp.version,
        imageUrl: miniapp.heroImageUrl,
        button: {
          title: `Join the ${miniapp.name}`,
          action: {
            name: `Launch ${miniapp.name}`,
            url: `${miniapp.homeUrl}`
          },
        },
      }),
    },
  };
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }
  ```
</CodeGroup>

<Tip>The `homeUrl` used in the `manifest` *must* have embed metadata defined, in order for the mini app to render correctly in the Base app.</Tip>

## Schema

<Card>
  <ParamField path="version" type="string" required>
    Version of the embed. Must be `"1"` or `"next"`.
  </ParamField>

  <ParamField path="imageUrl" type="string" required>
    Image URL for the embed. Must be 3:2 aspect ratio, maximum 10MB, maximum 1024 characters.
  </ParamField>

  <ParamField path="button" type="object" required>
    Button configuration object.
  </ParamField>
</Card>

### Button Configuration

Defines the launch button that appears on the embed.

<Card>
  <ParamField path="button.title" type="string" required>
    Button text. Maximum 32 characters.
  </ParamField>

  <ParamField path="button.action" type="object" required>
    Action configuration object. Maximum 1024 characters.
  </ParamField>
</Card>

### Action Configuration

Specifies what happens when the embed button is clicked.

<Card>
  <ParamField path="button.action.type" type="string" required>
    Action type. Must be `"launch_frame"`.
  </ParamField>

  <ParamField path="button.action.url" type="string">
    App URL to open. Defaults to the full URL of the page including query parameters. Maximum 1024 characters.
  </ParamField>

  <ParamField path="button.action.name" type="string">
    Application name. Maximum 32 characters. Defaults to manifest name.
  </ParamField>

  <ParamField path="button.action.splashImageUrl" type="string">
    Splash screen image URL. Must be 200x200 pixels. Maximum 32 characters. Defaults to manifest splash image.
  </ParamField>

  <ParamField path="button.action.splashBackgroundColor" type="string">
    Splash screen background color. Must be hex color code. Defaults to manifest splash background color.
  </ParamField>
</Card>

## Related Concepts

<CardGroup cols={2}>
  <Card title="Search and Discovery" href="/mini-apps/technical-guides/search-and-discovery">
    Learn how your manifest powers search indexing and category placement in the Base app discovery features.
  </Card>

  <Card title="Sharing and Social Graph" href="/mini-apps/technical-guides/sharing-and-social-graph">
    Learn how to maximize sharing, social engagement, and viral growth for your Mini App using Base's social graph features.
  </Card>
</CardGroup>


# Generate Dynamic Embed Images

> Create viral loops by turning every user interaction into dynamic, shareable content directly in the feed.

Embeds are the first thing users see when they encounter your mini app in their feed. Each share can display unique, contextual content tailored to drive engagement.

<Panel>
  <Frame caption="How metadata transforms into embeds">
    <img src="https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/Diagram.png?fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=6d670bcba887f0f5b919ef8f98f8081a" alt="Diagram showing the flow from mini app URL to metadata reading to image generation and final embed rendering in the Base app" data-og-width="3828" width="3828" data-og-height="2943" height="2943" data-path="images/minikit/Diagram.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/Diagram.png?w=280&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=46d66e3c36ba1206a93c86b83748a6fa 280w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/Diagram.png?w=560&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=4f5c7c712674bfd2a175e6cb3897d9df 560w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/Diagram.png?w=840&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=08c443d8471274ed3d90aa3e52b9db46 840w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/Diagram.png?w=1100&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=3a6cf84d9743e65185c8f5a249683000 1100w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/Diagram.png?w=1650&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=5c01fbe887a08a4f1002fd1a94d16fa7 1650w, https://mintcdn.com/base-a060aa97/gS084HRa38b8UMsN/images/minikit/Diagram.png?w=2500&fit=max&auto=format&n=gS084HRa38b8UMsN&q=85&s=33ff2eaf373a85514863cb279db7a4b1 2500w" />
  </Frame>

  When users share your mini app `URL`, the Base app requests your page, reads the fc:miniapp metadata, and fetches the `imageUrl`. You can serve either a static file (same image for everyone) or a dynamic endpoint that generates unique images on-demand based on URL parameters.
</Panel>

<Note>
  This guide uses Minikit but the principles apply to any framework with server-side rendering.
</Note>

## Implementation

This guide shows how to create shareable links with dynamic embed images. Users click a share button, which opens a compose window with their personalized link. When shared, the embed displays a unique image with their username.

<Steps>
  <Step title="Install the required package">
    Install `@vercel/og` by running the following command inside your project directory. This isn't required for Next.js App Router projects, as the package is already included:

    ```bash  theme={null}
    npm install @vercel/og
    ```
  </Step>

  <Step title="Create the image generation API endpoint">
    Build an API route that generates images based on the username parameter.

    ```tsx lines expandable wrap app/api/og/[username]/route.tsx theme={null}
    import { ImageResponse } from "next/og";

    export const dynamic = "force-dynamic";

    export async function GET(
      request: Request,
      { params }: { params: Promise<{ username: string }> }
    ) {
      const { username } = await params;

      return new ImageResponse(
        (
          <div
              style={{
                backgroundColor: 'black',
                backgroundSize: '150px 150px',
                height: '100%',
                width: '100%',
                display: 'flex',
                color: 'white',
                textAlign: 'center',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                flexWrap: 'nowrap',
              }}
            >
                Hello {username}        
            </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }
    ```

    This endpoint generates a unique image for each username: `/api/og/alice`, `/api/og/bob`, etc.

    <Warning>
      `<div>` elements must have `display: "flex"` or `display: "none"`. If you see a 500 error when accessing `/share/[username]`, check your ImageResponse JSX structure.
    </Warning>
  </Step>

  <Step title="Create shareable page with dynamic metadata">
    Build a page route that uses the username to generate `fc:miniapp` metadata pointing to your image endpoint.

    ```tsx lines expandable wrap app/share/[username]/page.tsx theme={null}
    import { minikitConfig } from "../../../minikit.config";
    import { Metadata } from "next";

    export async function generateMetadata(
      { params }: { params: Promise<{ username: string }> }
    ): Promise<Metadata> {
      try {
        const { username } = await params;
        
        return {
          title: minikitConfig.miniapp.name,
          description: minikitConfig.miniapp.description,
          other: {
            "fc:miniapp": JSON.stringify({
              version: minikitConfig.miniapp.version,
              imageUrl: `${minikitConfig.miniapp.homeUrl}/api/og/${username}`,
              button: {
                title: `Join the ${minikitConfig.miniapp.name} Waitlist`,
                action: {
                  name: `Launch ${minikitConfig.miniapp.name}`,
                  type: "launch_frame",
                  url: `${minikitConfig.miniapp.homeUrl}`,
                },
              },
            }),
          },
        };
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.log(JSON.stringify({ 
          timestamp: new Date().toISOString(), 
          level: 'error', 
          message: 'Failed to generate metadata', 
          error: errorMessage 
        }));
        
        return {
          title: minikitConfig.miniapp.name,
          description: minikitConfig.miniapp.description,
        };
      }
    }

    export default async function SharePage(
      { params }: { params: Promise<{ username: string }> }
    ) {
      const { username } = await params;

      return (
        <div>
          <h1>Share Page - {username}</h1>
        </div>
      );
    }
    ```

    When someone visits `/share/alice`, the metadata points to `/api/og/alice` for the embed image.
  </Step>

  <Step title="Add share button with composeCast">
    Create a button that opens Farcaster's compose window with the user's personalized share link.

    ```tsx lines expandable wrap app/page.tsx  highlight={6, 9-15} theme={null}
    import { useMiniKit, useComposeCast } from "@coinbase/onchainkit/minikit";
    import { minikitConfig } from "./minikit.config";

    export default function HomePage() {
      const { context } = useMiniKit();
      const { composeCast } = useComposeCast();


      const handleShareApp = () => {
        const userName = context?.user?.displayName || 'anonymous';
        composeCast({
          text: `Check out ${minikitConfig.miniapp.name}!`,
          embeds: [`${window.location.origin}/share/${userName}`]
        });
      };

      return (
        <div>
          <button onClick={handleShareApp}>
            Share Mini App
          </button>
        </div>
      );
    }
    ```

    When you click the button, it opens the compose window with `/share/alice` as the embed. The embed displays the dynamic image from `/api/og/alice`.
  </Step>

  <Step title="Test the flow">
    Verify the complete sharing flow works.

    ```bash lines wrap theme={null}
    # Start your app
    npm run dev

    # Test the image endpoint directly
    curl http://localhost:3000/api/og/testuser > test.png
    open test.png

    # Visit the share page to verify metadata
    curl http://localhost:3000/share/testuser | grep "fc:miniapp"
    ```

    Click the share button in your app to test the full experience. You should see the compose window open with your personalized share link, and the embed should display your custom generated image.
  </Step>
</Steps>

## Related Concepts

<CardGroup cols={1}>
  <Card title="Troubleshooting" href="/mini-apps/troubleshooting/how-search-works">
    Troubleshooting tips for embeds not displaying.
  </Card>
</CardGroup>
