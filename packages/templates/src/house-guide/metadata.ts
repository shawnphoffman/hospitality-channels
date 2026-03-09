import type { Template } from "@hospitality-channels/content-model";

export const houseGuideTemplate: Template & { schema: Record<string, unknown> } = {
  slug: "house-guide",
  name: "House Guide",
  description: "House rules, Wi-Fi, thermostat, parking, and general info",
  category: "info",
  status: "active",
  version: 1,
  schema: {
    fields: [
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
      {
        key: "thermostatInstructions",
        label: "Thermostat Instructions",
        type: "string",
        default: "",
      },
      {
        key: "quietHours",
        label: "Quiet Hours",
        type: "string",
        default: "10pm - 8am",
      },
      {
        key: "parkingInfo",
        label: "Parking Info",
        type: "string",
        default: "",
      },
      {
        key: "kitchenNotes",
        label: "Kitchen / Coffee / Towels",
        type: "string",
        default: "",
      },
      {
        key: "checkoutTime",
        label: "Checkout Time",
        type: "string",
        default: "11:00 AM",
      },
    ],
  },
};
