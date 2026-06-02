export type CreateBookmarkInput = {
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  favorite: number;
  archived: number;
};

export type UpdateBookmarkInput = Partial<CreateBookmarkInput>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const createFields = new Set([
  "title",
  "url",
  "description",
  "image_url",
  "favorite",
  "archived",
]);

const updateFields = new Set([
  "title",
  "url",
  "description",
  "image_url",
  "favorite",
  "archived",
]);

const importFields = new Set(["url"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownFields(
  body: Record<string, unknown>,
  allowedFields: Set<string>,
): ValidationResult<void> {
  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field),
  );

  if (unknownFields.length > 0) {
    return {
      ok: false,
      error: `Unknown field: ${unknownFields[0]}`,
    };
  }

  return { ok: true, value: undefined };
}

function requiredString(
  body: Record<string, unknown>,
  field: string,
): ValidationResult<string> {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `${field} must be a non-empty string` };
  }

  return { ok: true, value: value.trim() };
}

function optionalNullableString(
  body: Record<string, unknown>,
  field: string,
): ValidationResult<string | null> {
  const value = body[field];

  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string or null` };
  }

  return { ok: true, value };
}

function optionalFlag(
  body: Record<string, unknown>,
  field: string,
): ValidationResult<number> {
  const value = body[field];

  if (value === undefined) {
    return { ok: true, value: 0 };
  }

  return flag(value, field);
}

function flag(value: unknown, field: string): ValidationResult<number> {
  if (typeof value === "boolean") {
    return { ok: true, value: value ? 1 : 0 };
  }

  if (value === 0 || value === 1) {
    return { ok: true, value };
  }

  return { ok: false, error: `${field} must be a boolean or 0/1` };
}

function validateUrl(url: string): ValidationResult<string> {
  try {
    new URL(url);
    return { ok: true, value: url };
  } catch {
    return { ok: false, error: "url must be a valid URL" };
  }
}

export function validateCreateBookmarkRequest(
  body: unknown,
): ValidationResult<CreateBookmarkInput> {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const unknownFields = rejectUnknownFields(body, createFields);
  if (!unknownFields.ok) return unknownFields;

  const title = requiredString(body, "title");
  if (!title.ok) return title;

  const url = requiredString(body, "url");
  if (!url.ok) return url;

  const validUrl = validateUrl(url.value);
  if (!validUrl.ok) return validUrl;

  const description = optionalNullableString(body, "description");
  if (!description.ok) return description;

  const imageUrl = optionalNullableString(body, "image_url");
  if (!imageUrl.ok) return imageUrl;

  const favorite = optionalFlag(body, "favorite");
  if (!favorite.ok) return favorite;

  const archived = optionalFlag(body, "archived");
  if (!archived.ok) return archived;

  return {
    ok: true,
    value: {
      title: title.value,
      url: validUrl.value,
      description: description.value,
      image_url: imageUrl.value,
      favorite: favorite.value,
      archived: archived.value,
    },
  };
}

export function validateUpdateBookmarkRequest(
  body: unknown,
): ValidationResult<UpdateBookmarkInput> {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const unknownFields = rejectUnknownFields(body, updateFields);
  if (!unknownFields.ok) return unknownFields;

  if (Object.keys(body).length === 0) {
    return { ok: false, error: "At least one field is required" };
  }

  const input: UpdateBookmarkInput = {};

  if (body.title !== undefined) {
    const title = requiredString(body, "title");
    if (!title.ok) return title;
    input.title = title.value;
  }

  if (body.url !== undefined) {
    const url = requiredString(body, "url");
    if (!url.ok) return url;

    const validUrl = validateUrl(url.value);
    if (!validUrl.ok) return validUrl;

    input.url = validUrl.value;
  }

  if (body.description !== undefined) {
    const description = optionalNullableString(body, "description");
    if (!description.ok) return description;
    input.description = description.value;
  }

  if (body.image_url !== undefined) {
    const imageUrl = optionalNullableString(body, "image_url");
    if (!imageUrl.ok) return imageUrl;
    input.image_url = imageUrl.value;
  }

  if (body.favorite !== undefined) {
    const favorite = flag(body.favorite, "favorite");
    if (!favorite.ok) return favorite;
    input.favorite = favorite.value;
  }

  if (body.archived !== undefined) {
    const archived = flag(body.archived, "archived");
    if (!archived.ok) return archived;
    input.archived = archived.value;
  }

  return { ok: true, value: input };
}

export function validateImportBookmarkRequest(
  body: unknown,
): ValidationResult<{ url: string }> {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const unknownFields = rejectUnknownFields(body, importFields);
  if (!unknownFields.ok) return unknownFields;

  const url = requiredString(body, "url");
  if (!url.ok) return url;

  return { ok: true, value: { url: url.value } };
}
