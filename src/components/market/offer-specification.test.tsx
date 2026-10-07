import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OfferSpecification } from "./offer-specification";
import { WithIntl } from "./test-utils";

describe("seller specification", () => {
  it("shows the retained grade and quality reference with its declaration boundary", () => {
    render(
      <WithIntl>
        <OfferSpecification
          value={{
            grade: "Clear PET",
            specification: "Buyer Q1",
            lotState: "Hot washed",
            source: "seller_declared",
          }}
        />
      </WithIntl>,
    );
    expect(screen.getByText("Clear PET")).toBeInTheDocument();
    expect(screen.getByText("Buyer Q1")).toBeInTheDocument();
    expect(screen.getByText("Hot washed")).toBeInTheDocument();
    expect(screen.getByText(/does not verify quality/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("does not invent a grade for historical orders", () => {
    render(
      <WithIntl>
        <OfferSpecification value={undefined} />
      </WithIntl>,
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
