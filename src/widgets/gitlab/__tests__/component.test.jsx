import { render, screen } from "@testing-library/react";
import Component from "widgets/gitlab/component";
import { SettingsContext } from "utils/contexts/settings";
import React from "react";

import { __setEndpointMockData, __clearMocks } from "utils/proxy/use-widget-api";

const mockSettings = {
  hideErrors: false,
};

const service = {
  name: "Gitlab",
  widget: {
    type: "gitlab",
    key: "gitlabapikey",
    url: "https://127.0.0.1",
  },
};

describe("Gitlab Widget", () => {
  beforeEach(() => {
    __clearMocks();
  });

  it("renders", () => {
    render(
      <SettingsContext.Provider value={{ settings: mockSettings }}>
        <Component service={service} />
      </SettingsContext.Provider>,
    );

    expect(screen.getByText(/Groups/i)).toBeInTheDocument();
    expect(screen.getByText(/Issues/i)).toBeInTheDocument();
    expect(screen.getByText(/Merge Requests/i)).toBeInTheDocument();
    expect(screen.getByText(/Projects/i)).toBeInTheDocument();
  });

  it("renders with sample data", () => {
    __setEndpointMockData("counts", {
      data: {
        groups_count: 3,
        issues_count: 7,
        merge_requests_count: 2,
        projects_count: 5,
      },
    });

    render(
      <SettingsContext.Provider value={{ settings: {} }}>
        <Component service={service} />
      </SettingsContext.Provider>,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
