import { useEffect } from "react";

export const APP_NAME = "Cache";

export const pageTitle = (segment: string) => `${segment} | ${APP_NAME}`;

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
