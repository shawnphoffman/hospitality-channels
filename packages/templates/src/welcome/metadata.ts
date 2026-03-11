import type { Template } from "@hospitality-channels/content-model";

export const welcomeTemplate: Template & { schema: Record<string, unknown> } = {
  slug: "welcome",
  name: "Welcome",
  description: "Personalized welcome screen with guest name and Wi-Fi info",
  category: "welcome",
  status: "active",
  version: 1,
  schema: {
    fields: [
      {
        key: "guestName",
        label: "Guest Name",
        type: "string",
        default: "",
        required: true,
      },
      {
        key: "welcomeMessage",
        label: "Welcome Message",
        type: "string",
        default: "Welcome to your home away from home!",
      },
      {
        key: "heroBackgroundId",
        label: "Hero Background Image",
        type: "asset",
        assetType: "background",
        default: null,
      },
      {
        key: "wifiSsid",
        label: "Wi-Fi SSID",
        type: "string",
        default: "",
      },
      {
        key: "wifiPassword",
        label: "Wi-Fi Password",
        type: "string",
        default: "",
      },
    ],
  },
};
