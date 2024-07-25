import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { Response as responseInterface } from './interfaces';
dotenv.config();

let client: MongoClient | null = null;
let dbName: string = process.env.MONGO_DB || 'NO DB FOUND';

export async function getClient(): Promise<MongoClient | null> {
	if (!client) {
		client = new MongoClient(process.env.MONGO_URI || 'NO URI FOUND', {
			serverApi: {
				version: ServerApiVersion.v1,
				strict: true,
				deprecationErrors: true
			}
		});
	}
	try {
		await client.connect();
		return client;
	} catch (error) {
		console.error('Error connecting to the database', error);
		return null;
	}
}

/**
 * Function to find one document in a collection
 * @param collection - The collection to search in
 * @param filter - The filter to apply to the search, _id should be a string
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function findOne(
	collection: string,
	filter: Record<string, any>
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		if (filter._id) {
			filter._id = ObjectId.createFromHexString(filter._id);
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).findOne(filter);
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error finding document', error);

		return { error: true, message: 'Error finding document', result: null };
	}
}

/**
 * Function to find multiple documents in a collection
 * @param collection - The collection to search in
 * @param filter - The filter to apply to the search, _id should be a string
 * @param sort - The sort to apply to the search
 * @param limit - The limit of documents to return
 * @param skip - The number of documents to skip
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function find(
	collection: string,
	filter: Record<string, any>,
	sort: any = undefined,
	limit: number = 10000,
	skip: number = 0
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		if (filter._id) {
			filter._id = ObjectId.createFromHexString(filter._id);
		}
		const db = client.db(dbName);
		const result = await db
			.collection(collection)
			.find(filter)
			.limit(limit)
			.skip(skip)
			.toArray();
		if (sort) {
			result.sort(sort);
		}
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error finding documents', error);
		return { error: true, message: 'Error finding documents', result: null };
	}
}

/**
 * Function to find multiple documents in a collection using aggregation
 * @param collection - The collection to search in
 * @param aggregateParamas - The aggregation parameters to apply to the search
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function aggregateFind(
	collection: string,
	aggregateParamas: Array<object> = []
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).aggregate(aggregateParamas).toArray();
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error finding documents', error);
		return { error: true, message: 'Error finding documents', result: null };
	}
}

/**
 * Function to insert one document in a collection
 * @param collection - The collection to insert in
 * @param document - The document to insert into the collection
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function insertOne(
	collection: string,
	document: Record<string, any>
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).insertOne(document);
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error inserting document', error);
		return { error: true, message: 'Error inserting document', result: null };
	}
}

/**
 * Function to insert multiple documents in a collection
 * @param collection - The collection to insert in
 * @param documents - The documents to insert into the collection
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function insertMany(
	collection: string,
	documents: Record<string, any>[]
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).insertMany(documents);
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error inserting documents', error);
		return { error: true, message: 'Error inserting documents', result: null };
	}
}

/**
 * Function to delete one document in a collection
 * @param collection - The collection to delete in
 * @param filter - The filter to apply to the document to delete, _id should be a string
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function deleteOne(
	collection: string,
	filter: Record<string, any>
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		if (filter._id) {
			filter._id = ObjectId.createFromHexString(filter._id);
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).deleteOne(filter);
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error deleting document', error);
		return { error: true, message: 'Error deleting document', result: null };
	}
}

/**
 * Function to delete many documents in a collection
 * @param collection - The collection to delete in
 * @param filter - The filter to apply to the documents to delete, _id should be a string
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function deleteMany(
	collection: string,
	filter: Record<string, any>
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		if (filter._id && typeof filter._id === 'string') {
			filter._id = ObjectId.createFromHexString(filter._id);
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).deleteMany(filter);
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error deleting documents', error);
		return { error: true, message: 'Error deleting documents', result: null };
	}
}

/**
 * Function to update one document in a collection
 * @param collection - The collection to update in
 * @param filter - The filter to apply to the document to update, _id should be a string
 * @param update - The update to apply to the document
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function updateOne(
	collection: string,
	filter: Record<string, any>,
	update: Record<string, any>
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		if (filter._id) {
			filter._id = ObjectId.createFromHexString(filter._id);
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).updateOne(filter, { $set: update });
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error updating document', error);
		return { error: true, message: 'Error updating document', result: null };
	}
}

/**
 * Function to complex update one document in a collection
 * @param collection - The collection to update in
 * @param filter - The filter to apply to the document to update, _id should be a string
 * @param update - The update to apply to the document
 * @returns { error: boolean, message: string, result: any | null }
 */
export async function complexUpdateOne(
	collection: string,
	filter: Record<string, any>,
	update: Record<string, any>
): Promise<responseInterface> {
	try {
		const client = await getClient();
		if (!client) {
			return {
				error: true,
				message: 'Error connecting to the database',
				result: null
			};
		}
		if (filter._id) {
			filter._id = ObjectId.createFromHexString(filter._id);
		}
		const db = client.db(dbName);
		const result = await db.collection(collection).updateOne(filter, update);
		return { error: false, message: 'Success', result };
	} catch (error) {
		console.error('Error updating document', error);
		return { error: true, message: 'Error updating document', result: null };
	}
}
