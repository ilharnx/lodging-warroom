import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stay",
    short_name: "Stay",
    description: "Compare vacation rental listings with your crew",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF6F1",
    theme_color: "#E05A47",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
