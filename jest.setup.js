import "@testing-library/jest-dom";
import "./jest.i18n.js";

jest.mock("utils/proxy/use-widget-api");

jest.mock("next-i18next", () => {
  const reactI18next = require("react-i18next");
  const i18n = require("./jest.i18n").default;

  return {
    useTranslation: () => reactI18next.useTranslation("", { i18n }),
    Trans: reactI18next.Trans,
    I18nextProvider: reactI18next.I18nextProvider,
    appWithTranslation: (Component) => (props) => (
      <reactI18next.I18nextProvider i18n={i18n}>
        <Component {...props} />
      </reactI18next.I18nextProvider>
    ),
  };
});
