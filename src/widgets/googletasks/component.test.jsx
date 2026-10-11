// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";
import { expectBlockValue } from "test-utils/widget-assertions";

const { useWidgetAPI } = vi.hoisted(() => ({ useWidgetAPI: vi.fn() }));
vi.mock("utils/proxy/use-widget-api", () => ({ default: useWidgetAPI }));

import Component from "./component";

const tasks = [
  { id: "1", title: "Later", notes: "Buy paint", due: "2020-01-05", position: "001" },
  { id: "2", title: "No date", notes: null, due: null, position: "002" },
  { id: "3", title: "Today", notes: null, due: "2020-01-01", position: "003" },
  { id: "4", title: "Late", notes: null, due: "2019-12-30", position: "004" },
  { id: "5", title: "Far away", notes: null, due: "2020-01-20", position: "005" },
  { id: "6", title: "Next year", notes: null, due: "2021-03-02", position: "006" },
];
const titles = /^(Later|No date|Today|Late|Far away|Next year)$/;

describe("widgets/googletasks/component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // local noon, so the test does not depend on the time zone
    vi.setSystemTime(new Date(2020, 0, 1, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders placeholders while loading", () => {
    useWidgetAPI.mockReturnValue({ data: undefined, error: undefined });

    const { container } = renderWithProviders(<Component service={{ widget: { type: "googletasks" } }} />, {
      settings: { hideErrors: false },
    });

    expect(container.querySelectorAll(".service-block")).toHaveLength(3);
    expect(screen.getByText("googletasks.open")).toBeInTheDocument();
    expect(screen.getByText("googletasks.dueToday")).toBeInTheDocument();
    expect(screen.getByText("googletasks.overdue")).toBeInTheDocument();
  });

  it("counts open, due today and overdue tasks", () => {
    useWidgetAPI.mockReturnValue({ data: { tasks }, error: undefined });

    const { container } = renderWithProviders(<Component service={{ widget: { type: "googletasks" } }} />, {
      settings: { hideErrors: false },
    });

    expectBlockValue(container, "googletasks.open", 6);
    expectBlockValue(container, "googletasks.dueToday", 1);
    expectBlockValue(container, "googletasks.overdue", 1);
    expect(screen.queryByText("Later")).not.toBeInTheDocument();
  });

  it("hides the counts when enableBlocks is false", () => {
    useWidgetAPI.mockReturnValue({ data: { tasks }, error: undefined });

    const { container } = renderWithProviders(
      <Component service={{ widget: { type: "googletasks", enableBlocks: false, enableTaskList: true } }} />,
      { settings: { hideErrors: false } },
    );

    expect(container.querySelectorAll(".service-block")).toHaveLength(0);
    expect(screen.getByText("Later")).toBeInTheDocument();
  });

  it("lists tasks by due date with notes and readable due dates when enableTaskList is set", () => {
    useWidgetAPI.mockReturnValue({ data: { tasks }, error: undefined });

    renderWithProviders(<Component service={{ widget: { type: "googletasks", enableTaskList: true } }} />, {
      settings: { hideErrors: false },
    });

    expect(screen.getAllByText(titles).map((el) => el.textContent)).toEqual([
      "Late",
      "Today",
      "Later",
      "Far away",
      "Next year",
      "No date",
    ]);
    expect(screen.getByText("Buy paint")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
    expect(screen.getByText("today")).toBeInTheDocument();
    expect(screen.getByText("in 4 days")).toBeInTheDocument();
    // more than a week away: the date as dd.mm.yyyy
    expect(screen.getByText("20.01.2020")).toBeInTheDocument();
    expect(screen.getByText("02.03.2021")).toBeInTheDocument();
  });

  it("shows the error from the proxy", () => {
    useWidgetAPI.mockReturnValue({ data: undefined, error: { message: "boom" } });

    renderWithProviders(<Component service={{ widget: { type: "googletasks" } }} />, {
      settings: { hideErrors: false },
    });

    expect(screen.getAllByText(/boom/).length).toBeGreaterThan(0);
  });
});
