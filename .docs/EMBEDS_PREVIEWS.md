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
