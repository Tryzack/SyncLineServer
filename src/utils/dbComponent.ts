import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { strict } from "assert";

dotenv.config();

let client: MongoClient | null = null;
let dbName: string = process.env.MONGO_DB || "NO DB FOUND";

async function getClient(): Promise<MongoClient | null> {
	if (!client) {
		client = new MongoClient(process.env.MONGO_URI || "NO URI FOUND", {
			serverApi: {
				version: ServerApiVersion.v1,
				strict: true,
				deprecationErrors: true,
			},
		});
	}
	try {
		await client.connect();
		return client;
	} catch (error) {
		console.error("Error connecting to the database", error);
		return null;
	}
}

export async function findOne(collection: string, filter: Record<string, any>): Promise<{ error: boolean; message: string; result: any | null }> {
	try {
		const client = await getClient();
		if (!client) {
			return { error: true, message: "Error connecting to the database", result: null };
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).findOne(filter);
		return { error: false, message: "Success", result };
	} catch (error) {
		console.error("Error finding document", error);

		return { error: true, message: "Error finding document", result: null };
	}
}

export async function find(
	collection: string,
	filter: Record<string, any>,
	sort: any = undefined,
	limit: number = 10000,
	skip: number = 0
): Promise<{ error: boolean; message: string; result: any | null }> {
	try {
		const client = await getClient();
		if (!client) {
			return { error: true, message: "Error connecting to the database", result: null };
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).find(filter).limit(limit).skip(skip).toArray();
		if (sort) {
			result.sort(sort);
		}
		return { error: false, message: "Success", result };
	} catch (error) {
		console.error("Error finding documents", error);
		return { error: true, message: "Error finding documents", result: null };
	}
}

export async function insertOne(collection: string, document: Record<string, any>): Promise<{ error: boolean; message: string; result: any | null }> {
	try {
		const client = await getClient();
		if (!client) {
			return { error: true, message: "Error connecting to the database", result: null };
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).insertOne(document);
		return { error: false, message: "Success", result };
	} catch (error) {
		console.error("Error inserting document", error);
		return { error: true, message: "Error inserting document", result: null };
	}
}

export async function deleteOne(collection: string, filter: Record<string, any>): Promise<{ error: boolean; message: string; result: any | null }> {
	try {
		const client = await getClient();
		if (!client) {
			return { error: true, message: "Error connecting to the database", result: null };
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).deleteOne(filter);
		return { error: false, message: "Success", result };
	} catch (error) {
		console.error("Error deleting document", error);
		return { error: true, message: "Error deleting document", result: null };
	}
}
