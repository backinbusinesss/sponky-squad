import { useEffect, useState } from "react";

export function useAssetExists(path: string) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    fetch(path, { method: "HEAD" })
      .then((response) => {
        if (active) {
          setExists(response.ok);
        }
      })
      .catch(() => {
        if (active) {
          setExists(false);
        }
      });

    return () => {
      active = false;
    };
  }, [path]);

  return exists;
}
