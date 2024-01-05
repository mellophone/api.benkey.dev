/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://tasket.benkey.dev",
          },
          { key: "Access-Control-Expose-Headers", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST, GET, OPTIONS, DELETE, PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "append,delete,entries,foreach,get,has,keys,set,values,Authorization",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
