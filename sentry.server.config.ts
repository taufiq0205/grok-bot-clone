import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://991d21681b316767b637e886260de70a@o4512316731162624.ingest.us.sentry.io/4512316787392512",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
  },
})
