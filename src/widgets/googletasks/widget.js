import googletasksProxyHandler from "./proxy";

const widget = {
  api: "https://tasks.googleapis.com/tasks/v1/{endpoint}",
  proxyHandler: googletasksProxyHandler,
};

export default widget;
