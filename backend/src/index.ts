import "dotenv/config";
import prisma from "./db.js";
import { createApp } from "./app.js";

const PORT = process.env.PORT ?? 3000;
const app = createApp(prisma);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
