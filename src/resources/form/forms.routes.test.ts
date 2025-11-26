import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { Hono } from "hono";
import formsRoute from "@/resources/form/forms.routes";
import { createForm } from "@/resources/form/forms.service";

vi.mock("@/resources/form/forms.service", () => ({
  createForm: vi.fn(),
}));

describe("POST /seasons/:seasonCode/forms", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/", formsRoute);
    vi.clearAllMocks();
  });

  it("returns 200 with form data on success", async () => {
    // setup
    const mockForm = {
      formId: "form-123",
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    };
    (createForm as Mock).mockResolvedValue(mockForm);

    // exercise
    const res = await app.request("/seasons/S26/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: ["registration"],
      }),
    });

    // verify
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      formId: "form-123",
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    });
    expect(createForm).toHaveBeenCalledWith({
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    });
  });

  it("returns 400 with error message when createForm fails", async () => {
    // setup
    (createForm as Mock).mockRejectedValue(new Error("Database error"));

    // exercise
    const res = await app.request("/seasons/S26/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: ["registration"],
      }),
    });

    // verify
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({
      message: "Database error",
    });
  });

  it("returns 400 with unknown error message when error is not Error instance", async () => {
    // setup
    (createForm as Mock).mockRejectedValue("String error");

    // exercise
    const res = await app.request("/seasons/S26/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: ["registration"],
      }),
    });

    // verify
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({
      message: "Unknown error",
    });
  });
});
