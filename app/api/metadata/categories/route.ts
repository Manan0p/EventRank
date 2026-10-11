/** GET /api/metadata/categories — distinct catalog categories. */

import { eventCatalog, getCategories } from "@/lib/events";

export async function GET() {
  return Response.json({ categories: getCategories(eventCatalog) });
}
