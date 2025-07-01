export default {
  expo: {
    name: "Anonymous Chat",
    slug: "anonymous-chat",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourdomain.anonymouschat"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yourdomain.anonymouschat"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-secure-store"
    ],
    extra: {
      // Environment variables for development
      // These values are used during development
      development: {
        supabaseUrl: "https://iqzodmrmskrpzlwizfha.supabase.co",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxem9kbXJtc2tycHpsd2l6ZmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjMzNTgsImV4cCI6MjA2NTQ5OTM1OH0.WiWvgNNDmuGpz9bKjvuILGJy7n0Y2AXZEiCLjEUrdJE",
      },
      
      // Environment variables for production
      // These should be set using environment variables during build
      // DO NOT commit production keys to source code
      production: {
        // Use process.env values when building for production
        supabaseUrl: process.env.SUPABASE_URL || "https://iqzodmrmskrpzlwizfha.supabase.co",
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "your_production_anon_key",
      },
      
      // This will select the appropriate set of variables based on environment
      eas: {
        projectId: "your-eas-project-id" // Replace with your EAS project ID if using EAS
      },
      
      // For expo-router
      router: {
        origin: false
      },
    },
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true
    }
  }
};
