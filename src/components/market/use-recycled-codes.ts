"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "../../../convex/_generated/api";

/** Codes of the catalogue's recycled materials: flakes, granules, kraft, ingots. */
export function useRecycledCodes(): ReadonlySet<string> {
  const materials = useQuery(api.catalogue.materials);
  return useMemo(
    () =>
      new Set(
        materials
          ?.filter((material) => material.stage === "recycled")
          .map((material) => material.code),
      ),
    [materials],
  );
}
