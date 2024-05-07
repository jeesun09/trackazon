"use server"
import { log } from 'console';
import mongoose from 'mongoose';

let isConnected = false;//Variable to track the connection status

export async function connectToDB(){
    mongoose.set('strictQuery', true);

    if (!process.env.MONGODB_URI) return log("MongoDB URI is not Defined");

    if(isConnected) return log('Already connected to MongoDB');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        if (mongoose.connection.readyState != 1) {
          throw new Error("Mongoose is not connected to MongoDB");
        }
        isConnected = true;
        log('Connected to MongoDB');
    } catch (error: any) {
        log(`Failed to connect to MongoDB: ${error.message}`)
    }

}