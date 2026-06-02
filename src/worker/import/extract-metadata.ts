// M2: pure Bookmark Metadata extraction using the native HTMLRewriter.
//
// Reads <title> (falling back to og:title), the meta description (falling back
// to og:description), and og:image from a page's HTML. Returns a partial object
// so the caller can decide how to fall back on missing fields.

export type BookmarkMetadata = {
  title?: string;
  description?: string;
  image?: string;
};

const MAX_TITLE_LENGTH = 200;

export async function extractMetadata(html: string): Promise<BookmarkMetadata> {
  let titleText = "";
  let titleDone = false;
  let ogTitle: string | undefined;
  let metaDescription: string | undefined;
  let ogDescription: string | undefined;
  let ogImage: string | undefined;

  const rewriter = new HTMLRewriter()
    .on("title", {
      text(chunk) {
        if (titleDone) return;
        titleText += chunk.text;
        if (chunk.lastInTextNode) titleDone = true;
      },
    })
    .on("meta", {
      element(el) {
        const content = el.getAttribute("content");
        if (!content) return;

        const name = el.getAttribute("name")?.toLowerCase();
        const property = el.getAttribute("property")?.toLowerCase();

        if (name === "description" && metaDescription === undefined) {
          metaDescription = content;
        }
        if (property === "og:title" && ogTitle === undefined) {
          ogTitle = content;
        }
        if (property === "og:description" && ogDescription === undefined) {
          ogDescription = content;
        }
        if (property === "og:image" && ogImage === undefined) {
          ogImage = content;
        }
      },
    });

  // Consuming the transformed body is what drives the handlers above.
  await rewriter.transform(new Response(html)).arrayBuffer();

  const title = titleText.trim() || ogTitle?.trim() || undefined;
  const description =
    metaDescription?.trim() || ogDescription?.trim() || undefined;

  return {
    title: title ? capLength(title, MAX_TITLE_LENGTH) : undefined,
    description,
    image: ogImage?.trim() || undefined,
  };
}

function capLength(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trimEnd() : value;
}
