import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "postgresql://Nezar:npg_6c8WwbAVPOQR@ep-sweet-flower-ahjy6r27-pooler.c-3.us-east-1.aws.neon.tech/shine?sslmode=require&channel_binding=require&connect_timeout=30"
  },
});
