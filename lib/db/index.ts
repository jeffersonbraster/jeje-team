import "server-only"

// Keeps the database client out of browser bundles.
export { db } from "./client"
