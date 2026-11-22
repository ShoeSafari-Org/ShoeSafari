import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductImage } from "../../components/OptimizedImage";

describe("ProductImage", () => {
  it("uses the local fallback when the product image fails without removing its image frame", () => {
    render(
      <article aria-label="Trail runner product card">
        <ProductImage src="https://example.com/missing-shoe.jpg" alt="Trail runner" />
      </article>
    );

    const image = screen.getByRole("img", { name: "Trail runner" });
    fireEvent.error(image);

    expect(image).toHaveAttribute("src", "/images/notfoundimage.png");
    expect(image.parentElement).toHaveClass("aspect-square");
    expect(
      screen.getByRole("article", { name: "Trail runner product card" })
    ).toBeInTheDocument();

    fireEvent.error(image);
    expect(image).toHaveAttribute("src", "/images/notfoundimage.png");
  });

  it("uses the small card variant dimensions", () => {
    render(<ProductImage src="https://example.com/shoe.jpg" alt="Trail runner" size="small" />);
    expect(screen.getByRole("img", { name: "Trail runner" })).toHaveAttribute("width", "150");
  });
});
