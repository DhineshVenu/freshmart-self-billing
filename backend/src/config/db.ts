import mongoose from "mongoose";

const connectDatabase = async (): Promise<void> => {
  const defaultUri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/supermarket_billing";

  try {
    // Attempt local or environment MongoDB connection with a short timeout
    const connection = await mongoose.connect(defaultUri, {
      serverSelectionTimeoutMS: 3000,
    });

    console.log(
      `MongoDB connected successfully: ${connection.connection.host}`
    );
  } catch (error) {
    console.warn(
      `⚠️ Could not connect to local MongoDB at ${defaultUri}.`
    );
    console.log("⚡ Starting fallback in-memory MongoDB server for demo...");
  
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();

      const connection = await mongoose.connect(memoryUri);
      console.log(
        `✅ In-Memory MongoDB running successfully at ${connection.connection.host}`
      );
    } catch (memError) {
      console.error("❌ Failed to start in-memory MongoDB server:", memError);
      process.exit(1);
    }
  }
};



export default connectDatabase;
